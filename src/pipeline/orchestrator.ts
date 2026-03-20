import { relative, resolve } from "node:path"
import type { AnalysisResult } from "@defs/analysis.js"
import type { DittoConfig } from "@defs/config.js"
import type { FileTreeNode } from "@defs/extraction.js"
import type { PhaseError } from "@defs/pipeline.js"
import type { ILLMClient } from "@llm/client.js"
import type { UsageTracker } from "@llm/usage.js"
import { writeDocuments } from "@output/docs.js"
import { writePrompts } from "@output/prompts.js"
import { type ExtractionOutput, runExtraction } from "@source/index.js"
import { resolveRepo } from "@source/repo-resolver.js"
import { detectApps, findMonorepoRoot, resolveWorkspaceDeps } from "@source/workspace-detector.js"
import { ensureDir, readFileContent, writeFileContent } from "@utils/fs.js"
import { logger, phaseFail, phaseStart, phaseSuccess } from "@utils/logger.js"
import { renderAnalysisMarkdown } from "./assembly/analysis-renderer.js"
import { assembleDocuments, assemblePrompts, resolveEnvironment } from "./assembly/index.js"
import {
	countFiles,
	renderFileTree,
	renderMonorepoTree,
	renderProjectMeta,
} from "./assembly/tree-renderer.js"
import { createPipelineContext } from "./context.js"
import { synthesizeEssence } from "./essence.js"
import { loadSelectedFiles, resolveFiles } from "./file-loader.js"
import type { AnalysisPlan } from "./plan-parser.js"
import { planAnalysis } from "./planner.js"
import { formatReconciliation, reconcileAnalysis } from "./reconciliation.js"
import { evaluateAnalysisViability } from "./viability.js"
import { executeWaves } from "./wave-executor.js"
import { createWorkspace } from "./workspace.js"

export interface PipelineResult {
	success: boolean
	outputDir: string
	duration: number
	errors: PhaseError[]
	usage?: {
		totalCalls: number
		totalInputTokens: number
		totalOutputTokens: number
		totalTokens: number
	}
}

export interface AnalysisPipelineResult {
	success: boolean
	analysisJsonPath: string
	outputDir: string
	duration: number
	errors: PhaseError[]
	usage?: {
		totalCalls: number
		totalInputTokens: number
		totalOutputTokens: number
		totalTokens: number
	}
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
	overrides?: { llmClient?: ILLMClient; usage?: UsageTracker },
): Promise<AnalysisPipelineResult> {
	const startTime = Date.now()
	const errors: PhaseError[] = []

	const resolved = await resolveRepo(source)
	const ctx = createPipelineContext(source, resolved.localPath, config, overrides)
	const { llmClient: client, usage } = ctx
	let workspace: Awaited<ReturnType<typeof createWorkspace>> | null = null

	try {
		workspace = await createWorkspace(ctx.outputDir)

		// Detect monorepo
		const monorepoRoot = await findMonorepoRoot(resolved.localPath)
		const isMonorepo = !!monorepoRoot
		let rootPath = resolved.localPath
		let targetRelative = ""
		let depPackagePaths: string[] = []

		if (isMonorepo && monorepoRoot) {
			const rootPath_m = monorepoRoot
			const targetRelative_m = relative(rootPath_m, resolved.localPath)

			logger.info(`Monorepo detected: root=${rootPath_m}`)
			logger.info(`Target: ${targetRelative_m}`)

			// Check if user pointed at the root itself (not a specific app)
			if (targetRelative_m === "" || targetRelative_m === ".") {
				const apps = await detectApps(rootPath_m)
				if (apps.length > 1) {
					const appList = apps.map((a) => `  - ${a}`).join("\n")
					phaseFail(
						"Phase 1",
						`Multiple apps detected in monorepo. Please specify one:\n${appList}`,
					)
					return {
						success: false,
						analysisJsonPath: "",
						outputDir: ctx.outputDir,
						duration: Date.now() - startTime,
						errors: [
							{
								phase: "Phase 1",
								message: `Multiple apps: ${apps.join(", ")}`,
							},
						],
					}
				}
			}

			// Resolve workspace dependencies
			const depPaths = await resolveWorkspaceDeps(resolved.localPath, rootPath_m)
			if (depPaths.length > 0) {
				logger.info(`Monorepo: workspace deps = ${depPaths.join(", ")}`)
			}

			rootPath = rootPath_m
			targetRelative = targetRelative_m
			depPackagePaths = depPaths
		}

		// Phase 1: Extraction
		phaseStart("Phase 1", "Scanning and collecting files...")
		let extractionOutput: ExtractionOutput | undefined
		try {
			const phase1Result = await runExtraction(
				resolved.localPath,
				isMonorepo ? { rootPath, targetRelative, depPaths: depPackagePaths } : undefined,
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
		if (isMonorepo && depPackagePaths.length > 0) {
			// Dep-based tree: target files + dep package trees (already combined in fileTree)
			const targetTree = extraction.extraction.fileTree.filter(
				(n) => !depPackagePaths.includes(n.path),
			)
			const depNodes = extraction.extraction.fileTree.filter((n) =>
				depPackagePaths.includes(n.path),
			)

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
			await workspace.writeMarkdown(
				"file-tree.md",
				renderMonorepoTree(extraction.extraction.fileTree, targetRelative),
			)
		} else {
			await workspace.writeMarkdown("file-tree.md", renderFileTree(extraction.extraction.fileTree))
		}
		await workspace.writeMarkdown("project-meta.md", renderProjectMeta(extraction))

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

		// Resolve and validate file selection (auto-supplements if <50% match)
		resolveFiles(plan, extraction.extraction.fileTree, targetRelative)

		// Load selected files from disk (lazy loading — only what planner selected)
		const codeChunks = await loadSelectedFiles(
			plan,
			rootPath,
			depPackagePaths.length > 0 ? depPackagePaths : undefined,
		)
		const hasFileSelection = Object.values(plan.fileSelection).some((files) => files.length > 0)

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
		phaseStart("Phase 2", `Running ${plan.aspects.length} analyzers in ${plan.waves.length} waves`)
		const { results: analysisResults, failedAnalyzers } = await executeWaves({
			plan,
			codeChunks,
			extraction,
			workspace,
			client,
			usage,
			language: config.language === "ko" ? "ko" : "en",
			concurrency: 3,
		})

		const succeededCount = plan.aspects.length - failedAnalyzers.length
		logger.info(`Phase 2: ${succeededCount}/${plan.aspects.length} analyzers completed`)

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
		const reconciliation = reconcileAnalysis(analysisResults)
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
				tier: plan.aspects.length <= 3 ? "MINIMAL" : plan.aspects.length >= 7 ? "FULL" : "STANDARD",
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

		return {
			success: true,
			analysisJsonPath,
			outputDir: ctx.outputDir,
			duration: Date.now() - startTime,
			errors,
			usage: usage.getSummary(),
		}
	} finally {
		await workspace?.cleanup()
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

	// Read and parse analysis.json
	const analysisJson = await readFileContent(generateConfig.analysisPath)
	const analysisResult: AnalysisResult = JSON.parse(analysisJson)

	// Resolve environment (with optional target override from CLI)
	const env = resolveEnvironment(analysisResult.techStack, generateConfig.target)

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
export async function runPipeline(source: string, config: DittoConfig): Promise<PipelineResult> {
	const analysisResult = await runAnalysisPipeline(source, config)
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
