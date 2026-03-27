import { access } from "node:fs/promises"
import { relative, resolve } from "node:path"
import type { AnalysisResult } from "@defs/analysis.js"
import type { DittoConfig, LLMProvider } from "@defs/config.js"
import { UserError } from "@defs/errors.js"
import type { FileTreeNode } from "@defs/extraction.js"
import type { PhaseError } from "@defs/pipeline.js"
import type { AnalysisPlan } from "@domain/analysis/plan-parser.js"
import { formatReconciliation, reconcileAnalysis } from "@domain/analysis/reconciliation.js"
import { evaluateAnalysisViability } from "@domain/analysis/viability.js"
import { listTargetPresets } from "@domain/constants/target-presets.js"
import { renderAnalysisMarkdown } from "@domain/rendering/analysis-renderer.js"
import { resolveEnvironment } from "@domain/rendering/resolve-environment.js"
import {
	countFiles,
	renderFileTree,
	renderMonorepoTree,
	renderProjectMeta,
} from "@domain/rendering/tree-renderer.js"
import { formatProviderKeyHint } from "@infra/config/provider-env.js"
import { ensureDir, readFileContent, writeFileContent } from "@infra/fs.js"
import type { ILLMClient } from "@infra/llm/client.js"
import type { UsageTracker } from "@infra/llm/usage.js"
import { logger, phaseFail, phaseStart, phaseSuccess } from "@infra/logger.js"
import { writeDocuments } from "@infra/output/docs.js"
import { writePrompts } from "@infra/output/prompts.js"
import { type ExtractionOutput, runExtraction } from "@infra/source/index.js"
import { resolveRepo } from "@infra/source/repo-resolver.js"
import {
	detectApps,
	findMonorepoRoot,
	resolveWorkspaceDeps,
} from "@infra/source/workspace-detector.js"
import { assembleDocuments } from "./doc-assembler.js"
import { synthesizeEssence } from "./essence-synthesizer.js"
import { loadSelectedFiles, resolveFiles } from "./file-loader.js"
import { createPipelineContext } from "./pipeline-context.js"
import { planAnalysis } from "./planner.js"
import { assemblePrompts } from "./prompt-assembler.js"
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

// ── Early Validation ─────────────────────────────────────

const API_KEY_MESSAGES: Record<LLMProvider, string> = {
	openai: `OpenAI API key is required. Set ${formatProviderKeyHint("openai")} environment variable or configure via \`ditto config set apiKeys.openai <key>\`.`,
	anthropic: `Anthropic API key is required. Set ${formatProviderKeyHint("anthropic")} environment variable or configure via \`ditto config set apiKeys.anthropic <key>\`.`,
	zai: `Z.AI API key is required. Set ${formatProviderKeyHint("zai")} environment variable or configure via \`ditto config set apiKeys.zai <key>\`.`,
	gemini: `Gemini API key is required. Set ${formatProviderKeyHint("gemini")} environment variable or configure via \`ditto config set apiKeys.gemini <key>\`.`,
	openrouter: `OpenRouter API key is required. Set ${formatProviderKeyHint("openrouter")} environment variable or configure via \`ditto config set apiKeys.openrouter <key>\`.`,
	groq: `Groq API key is required. Set ${formatProviderKeyHint("groq")} environment variable or configure via \`ditto config set apiKeys.groq <key>\`.`,
	mistral: `Mistral API key is required. Set ${formatProviderKeyHint("mistral")} environment variable or configure via \`ditto config set apiKeys.mistral <key>\`.`,
	deepseek: `DeepSeek API key is required. Set ${formatProviderKeyHint("deepseek")} environment variable or configure via \`ditto config set apiKeys.deepseek <key>\`.`,
	xai: `xAI API key is required. Set ${formatProviderKeyHint("xai")} environment variable or configure via \`ditto config set apiKeys.xai <key>\`.`,
}

/** Validates config before any expensive work (extraction, LLM calls). */
export function validateAnalysisConfig(config: DittoConfig): void {
	const key = config.apiKeys[config.provider]
	if (!key) {
		throw new UserError(API_KEY_MESSAGES[config.provider])
	}

	if (config.provider === "zai") {
		logger.debug("Provider zai: json_object mode only (no structured output)")
	}
}

/** Validates generate pipeline inputs before any work. */
export async function validateGenerateInput(
	generateConfig: GenerateConfig,
): Promise<AnalysisResult> {
	// File existence
	try {
		await access(generateConfig.analysisPath)
	} catch {
		throw new UserError(
			`Analysis file not found: ${generateConfig.analysisPath}\nRun \`ditto analyze\` first to generate it.`,
		)
	}

	// JSON parsing
	let raw: string
	try {
		raw = await readFileContent(generateConfig.analysisPath)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new UserError(`Failed to read analysis file: ${message}`)
	}

	let parsed: unknown
	try {
		parsed = JSON.parse(raw)
	} catch {
		throw new UserError(
			`Invalid JSON in analysis file: ${generateConfig.analysisPath}\nThe file may be corrupted. Re-run \`ditto analyze\` to regenerate it.`,
		)
	}

	// Basic shape validation
	if (typeof parsed !== "object" || parsed === null) {
		throw new UserError("Analysis file does not contain a valid JSON object.")
	}
	const obj = parsed as Record<string, unknown>
	if (!obj.techStack) {
		throw new UserError("Analysis file is missing required field: techStack")
	}
	if (!obj.essence) {
		throw new UserError("Analysis file is missing required field: essence")
	}

	// Target preset validation
	if (generateConfig.target) {
		const known = listTargetPresets()
		if (!known.includes(generateConfig.target)) {
			throw new UserError(
				`Unknown target preset: "${generateConfig.target}". Available presets: ${known.join(", ")}`,
			)
		}
	}

	return parsed as AnalysisResult
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

	try {
		workspace = await createWorkspace(ctx.projectName)

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

		// Resolve and validate file selection (throws FileSelectionError if <50% match)
		resolveFiles(plan, extraction.extraction.fileTree, targetRelative)

		// Load selected files from disk (lazy loading — only what planner selected)
		const codeChunks = await loadSelectedFiles(
			plan,
			rootPath,
			depPackagePaths.length > 0 ? depPackagePaths : undefined,
		)
		const totalSelectedFiles = [...new Set(Object.values(plan.fileSelection).flat())].length
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

	// Early validation — fail fast with clear errors
	const analysisResult = await validateGenerateInput(generateConfig)

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
