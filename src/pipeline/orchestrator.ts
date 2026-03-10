import { resolve } from "node:path"
import { setLLMProvider } from "../llm/client.js"
import { createModel } from "../llm/provider.js"
import { UsageTracker } from "../llm/usage.js"
import { runAnalysis } from "../phases/analysis/index.js"
import { runDocumentation } from "../phases/documentation/index.js"
import { type ExtractionOutput, runExtraction } from "../phases/extraction/index.js"
import { resolveRepo } from "../phases/extraction/repo-resolver.js"
import { runPromptGeneration } from "../phases/prompt-gen/index.js"
import type { AnalysisResult } from "../types/analysis.js"
import type { DittoConfig } from "../types/config.js"
import type { DocumentSet } from "../types/documentation.js"
import { UserError } from "../types/errors.js"
import type { PhaseError } from "../types/pipeline.js"
import { ensureDir, writeFileContent } from "../utils/fs.js"
import { logger, phaseFail, phaseStart, phaseSuccess } from "../utils/logger.js"
import { createPipelineContext } from "./context.js"
import { runHealthCheck } from "./health-check.js"

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

export async function runPipeline(source: string, config: DittoConfig): Promise<PipelineResult> {
	const startTime = Date.now()
	const errors: PhaseError[] = []
	const usage = new UsageTracker()

	// Resolve repo path
	const resolved = await resolveRepo(source)
	const ctx = createPipelineContext(source, resolved.localPath, config)

	try {
		// Health Check
		phaseStart("Health Check", "Pre-analysis validation")
		const healthResult = await runHealthCheck(resolved.localPath)

		if (healthResult.status === "fail") {
			const failedChecks = healthResult.checks
				.filter((c) => c.status === "fail")
				.map((c) => c.message)
				.join(", ")
			throw new UserError(`Health check failed: ${failedChecks}`)
		}

		if (healthResult.status === "warn") {
			for (const check of healthResult.checks.filter((c) => c.status === "warn")) {
				logger.warn(`  ${check.name}: ${check.message}`)
			}
		}
		phaseSuccess("Health Check", "Passed")

		// Phase 1: Extraction (no LLM)
		phaseStart("Phase 1", "Extracting repository data...")
		let extractionOutput: ExtractionOutput | undefined
		try {
			const phase1Result = await runExtraction(resolved.localPath)
			extractionOutput = phase1Result.data

			if (phase1Result.errors.length > 0) {
				errors.push(...phase1Result.errors)
			}

			const stats = extractionOutput
				? `${extractionOutput.extraction.codeChunks.length} code files, ${extractionOutput.extraction.configFiles.length} configs`
				: "no data"
			phaseSuccess("Phase 1", `Extraction complete (${stats})`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			phaseFail("Phase 1", `Extraction failed: ${message}`)
			errors.push({ phase: "Phase 1", message, cause: error })
		}

		if (!extractionOutput) {
			return {
				success: false,
				outputDir: ctx.outputDir,
				duration: Date.now() - startTime,
				errors,
			}
		}

		// Create LLM model (needed for Phase 2-4)
		setLLMProvider(config.provider)
		const model = createModel(config)

		// Phase 2: Analysis (LLM) — always runs (both docs and prompts need it)
		let analysisResult: AnalysisResult | undefined
		phaseStart("Phase 2", "Analyzing design patterns...")
		try {
			const phase2Result = await runAnalysis(extractionOutput, model, usage, config.language)
			analysisResult = phase2Result.data

			if (phase2Result.errors.length > 0) {
				errors.push(...phase2Result.errors)
			}

			if (phase2Result.status === "failed") {
				phaseFail("Phase 2", "Analysis failed")
			} else {
				phaseSuccess("Phase 2", `Analysis ${phase2Result.status}`)
			}

			// Save analysis.json
			if (analysisResult) {
				const analysisDir = resolve(ctx.outputDir)
				await ensureDir(analysisDir)
				await writeFileContent(
					resolve(analysisDir, "analysis.json"),
					JSON.stringify(analysisResult, null, 2),
				)
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			phaseFail("Phase 2", `Analysis failed: ${message}`)
			errors.push({ phase: "Phase 2", message, cause: error })
		}

		if (!analysisResult) {
			return {
				success: false,
				outputDir: ctx.outputDir,
				duration: Date.now() - startTime,
				errors,
				usage: usage.getSummary(),
			}
		}

		// Phase 3: Documentation (LLM)
		let documentSet: DocumentSet | undefined
		if (!config.promptsOnly) {
			const docOutputDir = resolve(ctx.outputDir, "design-spec")
			try {
				const phase3Result = await runDocumentation(
					analysisResult,
					model,
					usage,
					docOutputDir,
					config.language,
				)
				documentSet = phase3Result.data

				if (phase3Result.errors.length > 0) {
					errors.push(...phase3Result.errors)
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				phaseFail("Phase 3", `Documentation failed: ${message}`)
				errors.push({ phase: "Phase 3", message, cause: error })
			}
		}

		// Phase 4: Prompt Generation (LLM)
		if (!config.docsOnly) {
			if (!documentSet && !config.promptsOnly) {
				logger.warn(
					"Phase 3 (Documentation) failed — prompts will be generated without design spec context",
				)
			}
			const promptOutputDir = resolve(ctx.outputDir, "prompts")
			const docSet = documentSet ?? { documents: [], outputDir: "" }
			try {
				const phase4Result = await runPromptGeneration(
					analysisResult,
					docSet,
					model,
					usage,
					promptOutputDir,
				)

				if (phase4Result.errors.length > 0) {
					errors.push(...phase4Result.errors)
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				phaseFail("Phase 4", `Prompt generation failed: ${message}`)
				errors.push({ phase: "Phase 4", message, cause: error })
			}
		}

		return {
			success: errors.length === 0,
			outputDir: ctx.outputDir,
			duration: Date.now() - startTime,
			errors,
			usage: usage.getSummary(),
		}
	} finally {
		await resolved.cleanup()
	}
}
