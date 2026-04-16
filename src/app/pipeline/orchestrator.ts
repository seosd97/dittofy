import { resolve } from "node:path"
import type { AnalysisResult } from "@defs/analysis.js"
import type { DittoConfig } from "@defs/config.js"
import type { ExtractionOutput, FileTreeNode } from "@defs/extraction.js"
import type { PhaseError } from "@defs/pipeline.js"
import type { AnalysisPlan } from "@domain/analysis/plan-parser.js"
import { formatReconciliation, reconcileAnalysis } from "@domain/analysis/reconciliation.js"
import { evaluateAnalysisViability } from "@domain/analysis/viability.js"
import { ANALYSIS, TIER_THRESHOLDS } from "@domain/constants/analysis.js"
import { renderAnalysisMarkdown } from "@domain/rendering/analysis-renderer.js"
import { resolveEnvironment } from "@domain/rendering/resolve-environment.js"
import {
	countFiles,
	renderFileTree,
	renderMonorepoTree,
	renderProjectMeta,
} from "@domain/rendering/tree-renderer.js"
import { ensureDir, writeFileContent } from "@infra/fs.js"
import type { ILLMClient } from "@infra/llm/client.js"
import type { UsageTracker } from "@infra/llm/usage.js"
import { logger, phaseFail, phaseStart, phaseSuccess } from "@infra/logger.js"
import { writeDocuments } from "@infra/output/docs.js"
import { writePrompts } from "@infra/output/prompts.js"
import { runExtraction } from "@infra/source/index.js"
import { resolveRepo } from "@infra/source/repo-resolver.js"
import { assembleDocuments } from "./doc-assembler.js"
import { synthesizeEssence } from "./essence-synthesizer.js"
import { loadSelectedFiles, resolveFiles } from "./file-loader.js"
import { detectMonorepo } from "./monorepo-utils.js"
import { createPipelineContext } from "./pipeline-context.js"
import { planAnalysis } from "./planner.js"
import { assemblePrompts } from "./prompt-assembler.js"
import { validateAnalysisConfig, validateGenerateInput } from "./validation.js"
import { executeWaves } from "./wave-executor.js"
import { createWorkspace } from "./workspace.js"

export interface AspectBreakdown {
	succeeded: string[]
	failed: string[]
}

export interface DetailedUsage {
	totalCalls: number
	totalInputTokens: number
	totalOutputTokens: number
	totalReasoningTokens: number
	totalTokens: number
	records?: { phase: string; analyzer: string; inputTokens: number; outputTokens: number }[]
}

export interface PipelineResult {
	success: boolean
	outputDir: string
	duration: number
	errors: PhaseError[]
	aspects?: AspectBreakdown
	filesWritten?: string[]
	usage?: DetailedUsage
}

export interface AnalysisPipelineResult {
	success: boolean
	analysisJsonPath: string
	outputDir: string
	duration: number
	errors: PhaseError[]
	aspects?: AspectBreakdown
	filesWritten?: string[]
	usage?: DetailedUsage
}

export interface GenerateConfig {
	analysisPath: string
	output: string
	language: "ko" | "en"
	target?: string
	docsOnly?: boolean
	promptsOnly?: boolean
}

export interface GeneratePipelineResult {
	success: boolean
	outputDir: string
	duration: number
	errors: PhaseError[]
}

/**
 * Phase 1-2: Health Check + Extraction + Analysis → analysis.json
 */
export async function runAnalysisPipeline(
	source: string,
	config: DittoConfig,
	overrides?: { llmClient?: ILLMClient; usage?: UsageTracker; includePaths?: string[] },
): Promise<AnalysisPipelineResult> {
	const startTime = Date.now()
	const errors: PhaseError[] = []

	// Early validation — fail fast before expensive operations
	validateAnalysisConfig(config)

	const resolved = await resolveRepo(source)
	const ctx = createPipelineContext(source, resolved.localPath, config, overrides)
	const { llmClient: client, usage } = ctx
	let workspace: Awaited<ReturnType<typeof createWorkspace>> | null = null
	let succeeded = false

	try {
		workspace = await createWorkspace(ctx.projectName)

		// Detect monorepo
		const monorepoResult = await detectMonorepo(resolved.localPath, { failOnMultipleApps: true })

		if (monorepoResult.error) {
			phaseFail(monorepoResult.error.phase, monorepoResult.error.message)
			return {
				success: false,
				analysisJsonPath: "",
				outputDir: ctx.outputDir,
				duration: Date.now() - startTime,
				errors: [{ phase: monorepoResult.error.phase, message: monorepoResult.error.message }],
			}
		}

		const isMonorepo = !!monorepoResult.info
		const rootPath = monorepoResult.info?.rootPath ?? resolved.localPath
		const targetRelative = monorepoResult.info?.targetRelative ?? ""
		const depPackagePaths = monorepoResult.info?.depPaths ?? []

		// Phase 1: Extraction
		phaseStart("Phase 1", "Scanning and collecting files...")
		let extractionOutput: ExtractionOutput | undefined
		try {
			const phase1Result = await runExtraction(
				resolved.localPath,
				isMonorepo ? { rootPath, targetRelative, depPaths: depPackagePaths } : undefined,
				overrides?.includePaths,
			)
			extractionOutput = phase1Result.data

			if (phase1Result.errors.length > 0) {
				errors.push(...phase1Result.errors)
			}

			const fileCount = extractionOutput
				? extractionOutput.extraction.fileTree.reduce(
						(sum: number, n: FileTreeNode) => sum + countFiles(n),
						0,
					)
				: 0
			phaseSuccess("Phase 1", `Scan complete (${fileCount} files)`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			phaseFail("Phase 1", `Extraction failed: ${message}`)
			errors.push({ phase: "Phase 1", message, cause: error })
		}

		if (!extractionOutput) {
			return {
				success: false,
				analysisJsonPath: "",
				outputDir: ctx.outputDir,
				duration: Date.now() - startTime,
				errors,
			}
		}

		const extraction = extractionOutput

		// Validate extraction results
		const totalFiles = extraction.extraction.fileTree.reduce(
			(sum: number, n: FileTreeNode) => sum + countFiles(n),
			0,
		)
		if (totalFiles === 0) {
			phaseFail("Phase 1", "No source files found — nothing to analyze")
			return {
				success: false,
				analysisJsonPath: "",
				outputDir: ctx.outputDir,
				duration: Date.now() - startTime,
				errors: [
					...errors,
					{ phase: "Phase 1", message: "No source files found — nothing to analyze" },
				],
			}
		}

		// Write workspace files for planning
		await writeWorkspaceTree(
			workspace,
			extraction.extraction.fileTree,
			isMonorepo,
			targetRelative,
			depPackagePaths,
		)
		await workspace.writeMarkdown(
			"project-meta.md",
			renderProjectMeta({
				techStack: extraction.techStack,
				projectMeta: extraction.extraction.projectMeta,
				monorepo: extraction.monorepo,
			}),
		)

		// Phase 2 - Pass 1: Analysis Planning
		phaseStart("Phase 2", "Planning analysis...")
		let plan: AnalysisPlan
		try {
			plan = await planAnalysis(workspace, client, usage, config.language === "ko" ? "ko" : "en")
			logger.info(`Analysis plan: ${plan.aspects.length} aspects, ${plan.waves.length} waves`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			phaseFail("Phase 2", `Analysis planning failed: ${message}`)
			return {
				success: false,
				analysisJsonPath: "",
				outputDir: ctx.outputDir,
				duration: Date.now() - startTime,
				errors: [...errors, { phase: "Phase 2 - Planning", message }],
				usage: usage.getSummary(),
			}
		}

		// Resolve and validate file selection (throws FileSelectionError if <50% match)
		const { plan: resolvedPlan } = resolveFiles(
			plan,
			extraction.extraction.fileTree,
			targetRelative,
			{
				debug: (msg: string) => logger.debug(msg),
				warn: (msg: string) => logger.warn(msg),
				info: (msg: string) => logger.info(msg),
			},
		)

		// Load selected files from disk (lazy loading — only what planner selected)
		const codeChunks = await loadSelectedFiles(
			resolvedPlan,
			rootPath,
			depPackagePaths.length > 0 ? depPackagePaths : undefined,
		)
		const totalSelectedFiles = [...new Set(Object.values(resolvedPlan.fileSelection).flat())].length
		const hasFileSelection = totalSelectedFiles > 0

		if (hasFileSelection && codeChunks.length === 0) {
			phaseFail("Phase 2", "No files loaded — all selected files failed to read")
			return {
				success: false,
				analysisJsonPath: "",
				outputDir: ctx.outputDir,
				duration: Date.now() - startTime,
				errors: [...errors, { phase: "Phase 2", message: "No files loaded after planning" }],
				usage: usage.getSummary(),
			}
		}

		// Phase 2 - Pass 2: Wave Execution
		phaseStart(
			"Phase 2",
			`Running ${resolvedPlan.aspects.length} analyzers in ${resolvedPlan.waves.length} waves`,
		)
		const { results: analysisResults, failedAnalyzers } = await executeWaves({
			plan: resolvedPlan,
			codeChunks,
			extraction,
			workspace,
			client,
			usage,
			language: config.language === "ko" ? "ko" : "en",
			concurrency: ANALYSIS.concurrency,
		})

		const succeededCount = resolvedPlan.aspects.length - failedAnalyzers.length
		logger.info(`Phase 2: ${succeededCount}/${resolvedPlan.aspects.length} analyzers completed`)

		if (failedAnalyzers.length > 0) {
			logger.warn(`${failedAnalyzers.length} analyzers failed: ${failedAnalyzers.join(", ")}`)
		}

		// Viability check
		const viability = evaluateAnalysisViability(analysisResults, failedAnalyzers)
		if (!viability.viable) {
			phaseFail("Phase 2", viability.reason)
			return {
				success: false,
				analysisJsonPath: "",
				outputDir: ctx.outputDir,
				duration: Date.now() - startTime,
				errors,
				usage: usage.getSummary(),
			}
		}
		if (viability.severity === "warning") {
			logger.warn(`Phase 2: ${viability.reason}`)
		}

		// Phase 2 - Pass 3: Reconciliation + Essence
		const reconciliation = reconcileAnalysis(analysisResults, {
			info: (msg: string) => logger.info(msg),
		})
		if (reconciliation.conflicts.length > 0) {
			await workspace.writeMarkdown("reconciliation.md", formatReconciliation(reconciliation))
		}

		phaseStart("Phase 2", "Synthesizing design essence")
		let essence: AnalysisResult["essence"] | undefined
		try {
			essence = await synthesizeEssence(
				analysisResults,
				client,
				usage,
				config.language === "ko" ? "ko" : "en",
				reconciliation,
			)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			errors.push({ phase: "Essence Synthesizer", message })
			logger.warn(`Essence Synthesizer failed: ${message}`)
		}

		if (!essence) {
			phaseFail("Phase 2", "Essence synthesis failed")
			return {
				success: false,
				analysisJsonPath: "",
				outputDir: ctx.outputDir,
				duration: Date.now() - startTime,
				errors,
				usage: usage.getSummary(),
			}
		}

		const analysisResult: AnalysisResult = {
			techStack: extraction.techStack,
			...analysisResults,
			essence,
			failedAnalyzers,
			meta: {
				version: 2,
				analyzedAt: new Date().toISOString(),
				source,
				dittoVersion: "0.1.0",
				tier:
					resolvedPlan.aspects.length <= TIER_THRESHOLDS.minimal
						? "MINIMAL"
						: resolvedPlan.aspects.length >= TIER_THRESHOLDS.full
							? "FULL"
							: "STANDARD",
				duration: Date.now() - startTime,
				monorepo: isMonorepo ? { root: rootPath, target: targetRelative } : undefined,
			},
		}

		phaseSuccess("Phase 2", "Analysis complete")

		// Save analysis.json (internal, for generate pipeline)
		const analysisDir = resolve(ctx.outputDir)
		await ensureDir(analysisDir)
		const analysisJsonPath = resolve(analysisDir, "analysis.json")
		await writeFileContent(analysisJsonPath, JSON.stringify(analysisResult, null, 2))

		// Save analysis.md (user-facing summary)
		await writeFileContent(
			resolve(analysisDir, "analysis.md"),
			renderAnalysisMarkdown(analysisResult),
		)

		succeeded = true

		return {
			success: true,
			analysisJsonPath,
			outputDir: ctx.outputDir,
			duration: Date.now() - startTime,
			errors,
			aspects: {
				succeeded: resolvedPlan.aspects.filter((a) => !failedAnalyzers.includes(a)),
				failed: failedAnalyzers,
			},
			filesWritten: ["analysis.json", "analysis.md"],
			usage: usage.getSummary() as DetailedUsage,
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		errors.push({ phase: "Pipeline", message })
		return {
			success: false,
			analysisJsonPath: "",
			outputDir: ctx.outputDir,
			duration: Date.now() - startTime,
			errors,
		}
	} finally {
		if (succeeded || !workspace) {
			await workspace?.cleanup()
		} else {
			logger.info("")
			logger.warn("Workspace preserved for resume:")
			logger.warn(`  ${workspace.tmpDir}`)
			logger.warn("Re-run with debug mode to inspect intermediate results.")
		}
		await resolved.cleanup()
	}
}

/**
 * Phase 3-4: Read analysis.json → Docs + Prompts
 */
export async function runGeneratePipeline(
	generateConfig: GenerateConfig,
): Promise<GeneratePipelineResult> {
	const startTime = Date.now()
	const errors: PhaseError[] = []

	// Early validation — fail fast with clear errors
	const analysisResult = await validateGenerateInput(generateConfig)

	// Resolve environment (with optional target override from CLI)
	const env = resolveEnvironment(analysisResult.techStack, generateConfig.target, {
		info: (msg: string) => logger.info(msg),
		warn: (msg: string) => logger.warn(msg),
	})

	const outputDir = generateConfig.output

	// Phase 3: Documentation — template-based (no LLM)
	if (!generateConfig.promptsOnly) {
		phaseStart("Phase 3", "Generating documentation from templates")
		const docOutputDir = resolve(outputDir, "design-spec")

		const documentSet = assembleDocuments(
			analysisResult,
			env,
			generateConfig.language,
			docOutputDir,
		)
		await writeDocuments(documentSet)

		if (documentSet.documents.length === 0) {
			phaseFail("Phase 3", "No documents generated (all templates returned null)")
			errors.push({
				phase: "Phase 3",
				message: "No documents generated (all templates returned null)",
			})
		} else {
			phaseSuccess("Phase 3", `Generated ${documentSet.documents.length} documents`)
		}
	}

	// Phase 4: Prompt Generation — template-based (no LLM)
	if (!generateConfig.docsOnly) {
		phaseStart("Phase 4", "Generating implementation prompts from templates")
		const promptOutputDir = resolve(outputDir, "prompts")

		try {
			const promptSet = assemblePrompts(
				analysisResult,
				env,
				generateConfig.language,
				promptOutputDir,
			)
			await writePrompts(promptSet)
			phaseSuccess("Phase 4", `Generated ${promptSet.steps.length} implementation prompts`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			phaseFail("Phase 4", `Prompt generation failed: ${message}`)
			errors.push({ phase: "Phase 4", message, cause: error })
		}
	}

	return {
		success: errors.length === 0,
		outputDir,
		duration: Date.now() - startTime,
		errors,
	}
}

/**
 * Legacy convenience: runs analysis + generation in one shot
 */
export async function runPipeline(
	source: string,
	config: DittoConfig,
	overrides?: { includePaths?: string[] },
): Promise<PipelineResult> {
	const analysisResult = await runAnalysisPipeline(
		source,
		config,
		overrides ? { includePaths: overrides.includePaths } : undefined,
	)
	if (!analysisResult.success) {
		return {
			success: false,
			outputDir: analysisResult.outputDir,
			duration: analysisResult.duration,
			errors: analysisResult.errors,
			usage: analysisResult.usage,
		}
	}

	const generateResult = await runGeneratePipeline({
		analysisPath: analysisResult.analysisJsonPath,
		output: analysisResult.outputDir,
		language: config.language,
		docsOnly: config.docsOnly,
		promptsOnly: config.promptsOnly,
	})

	return {
		success: generateResult.success,
		outputDir: generateResult.outputDir,
		duration: analysisResult.duration + generateResult.duration,
		errors: [...analysisResult.errors, ...generateResult.errors],
		usage: analysisResult.usage,
	}
}

async function writeWorkspaceTree(
	workspace: Awaited<ReturnType<typeof createWorkspace>>,
	fileTree: FileTreeNode[],
	isMonorepo: boolean,
	targetRelative: string,
	depPackagePaths: string[],
): Promise<void> {
	if (isMonorepo && depPackagePaths.length > 0) {
		const targetTree = fileTree.filter((n) => !depPackagePaths.includes(n.path))
		const depNodes = fileTree.filter((n) => depPackagePaths.includes(n.path))

		const lines: string[] = ["# Project Structure\n"]
		lines.push(`## Target: ${targetRelative}`)
		lines.push(renderFileTree(targetTree, "", 0))
		lines.push("")

		if (depNodes.length > 0) {
			lines.push("## Related Packages")
			for (const dep of depNodes) {
				lines.push(`### ${dep.path}`)
				if (dep.children) {
					lines.push(renderFileTree(dep.children, "", 0))
				}
				lines.push("")
			}
		}

		await workspace.writeMarkdown("file-tree.md", lines.filter(Boolean).join("\n"))
	} else if (isMonorepo) {
		await workspace.writeMarkdown("file-tree.md", renderMonorepoTree(fileTree, targetRelative))
	} else {
		await workspace.writeMarkdown("file-tree.md", renderFileTree(fileTree))
	}
}
