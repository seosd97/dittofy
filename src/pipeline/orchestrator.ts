import { resolve } from "node:path"
import { ASPECT_NAMES, ASPECT_REGISTRY } from "@aspects/registry.js"
import type { AnalysisResult } from "@defs/analysis.js"
import type { AnalysisResultMap, AspectName } from "@defs/aspect-map.js"
import type { DittoConfig } from "@defs/config.js"
import type { AspectDescriptor } from "@defs/descriptor.js"
import type { DocumentEntry, DocumentSet } from "@defs/documentation.js"
import { UserError } from "@defs/errors.js"
import type { PhaseError } from "@defs/pipeline.js"
import { setLLMProvider } from "@llm/core/client.js"
import { createModel } from "@llm/core/provider.js"
import { runAnalyzer } from "@llm/runners/analyzer.js"
import { runDocGenerator } from "@llm/runners/generator.js"
import { UsageTracker } from "@llm/usage.js"
import { writeDocuments } from "@output/docs.js"
import { writePrompts } from "@output/prompts.js"
import { type ExtractionOutput, runExtraction } from "@source/index.js"
import { resolveRepo } from "@source/repo-resolver.js"
import { ensureDir, writeFileContent } from "@utils/fs.js"
import { logger, phaseFail, phaseStart, phaseSuccess } from "@utils/logger.js"
import { createPipelineContext } from "./context.js"
import { synthesizeEssence } from "./essence.js"
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

const ANALYSIS_CONCURRENCY = 3
const MIN_ANALYZERS_REQUIRED = 3

export async function runPipeline(source: string, config: DittoConfig): Promise<PipelineResult> {
	const startTime = Date.now()
	const errors: PhaseError[] = []
	const usage = new UsageTracker()

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

		// Phase 1: Extraction
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

		// extractionOutput is guaranteed non-null after the guard above
		const extraction = extractionOutput

		// Create LLM model
		setLLMProvider(config.provider)
		const model = createModel(config)

		// Phase 2: Analysis — registry-driven
		phaseStart(
			"Phase 2",
			`Running ${ASPECT_NAMES.length} design analyzers (concurrency: ${ANALYSIS_CONCURRENCY})`,
		)

		const withLimit = createConcurrencyLimiter(ANALYSIS_CONCURRENCY)
		const analysisResults: AnalysisResultMap = {
			designTokens: null,
			typography: null,
			componentCatalog: null,
			layoutSystem: null,
			pageStructures: null,
			responsiveStrategy: null,
			interactionPatterns: null,
		}
		const failedAnalyzers: string[] = []

		const analyzerPromises = ASPECT_NAMES.map((name) => {
			const descriptor = ASPECT_REGISTRY[name]
			return withLimit(async () => {
				try {
					const result = await runAnalyzer(
						descriptor as AspectDescriptor<typeof name>,
						extraction,
						model,
						usage,
						config.language === "ko" ? "ko" : "en",
					)
					;(analysisResults as Record<string, unknown>)[name] = result
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					errors.push({ phase: descriptor.displayName, message, cause: error })
					logger.warn(`${descriptor.displayName} failed: ${message}`)
					failedAnalyzers.push(name)
				}
			})
		})

		await Promise.allSettled(analyzerPromises)

		const succeededCount = ASPECT_NAMES.length - failedAnalyzers.length
		logger.info(
			`Phase 2: ${succeededCount}/${ASPECT_NAMES.length} analyzers completed successfully`,
		)

		if (succeededCount === 0) {
			phaseFail("Phase 2", "All analyzers failed")
			return {
				success: false,
				outputDir: ctx.outputDir,
				duration: Date.now() - startTime,
				errors,
				usage: usage.getSummary(),
			}
		}

		if (succeededCount < MIN_ANALYZERS_REQUIRED) {
			phaseFail(
				"Phase 2",
				`Only ${succeededCount}/${ASPECT_NAMES.length} succeeded (minimum: ${MIN_ANALYZERS_REQUIRED})`,
			)
			return {
				success: false,
				outputDir: ctx.outputDir,
				duration: Date.now() - startTime,
				errors,
				usage: usage.getSummary(),
			}
		}

		// Essence synthesis
		phaseStart("Phase 2", "Synthesizing design essence")
		let essence: AnalysisResult["essence"] | undefined
		try {
			essence = await synthesizeEssence(
				analysisResults,
				model,
				usage,
				config.language === "ko" ? "ko" : "en",
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
		}

		phaseSuccess("Phase 2", "Analysis complete")

		// Save analysis.json
		const analysisDir = resolve(ctx.outputDir)
		await ensureDir(analysisDir)
		await writeFileContent(
			resolve(analysisDir, "analysis.json"),
			JSON.stringify(analysisResult, null, 2),
		)

		// Phase 3: Documentation — registry-driven
		let documentSet: DocumentSet | undefined
		if (!config.promptsOnly) {
			phaseStart("Phase 3", "Generating documentation")
			const docOutputDir = resolve(ctx.outputDir, "design-spec")
			const documents: DocumentEntry[] = []

			for (const name of ASPECT_NAMES) {
				const descriptor = ASPECT_REGISTRY[name]
				const data = analysisResults[name]
				if (!data) continue
				if (!descriptor.docGenerator.canGenerate(data as never)) continue

				try {
					const doc = await runDocGenerator(
						descriptor as AspectDescriptor<typeof name>,
						data as never,
						essence,
						model,
						usage,
						config.language,
					)
					documents.push(doc)
					logger.debug(`Generated: ${doc.filename}`)
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					errors.push({ phase: `${descriptor.displayName} Doc`, message, cause: error })
					logger.warn(`Failed to generate ${descriptor.displayName} doc: ${message}`)
				}
			}

			documentSet = { documents, outputDir: docOutputDir }
			await writeDocuments(documentSet)

			if (documents.length === 0) {
				phaseFail("Phase 3", "All document generators failed")
			} else {
				phaseSuccess("Phase 3", `Generated ${documents.length} documents`)
			}
		}

		// Phase 4: Prompt Generation
		if (!config.docsOnly) {
			try {
				const { runPromptGeneration } = await import("./prompt-gen/index.js")
				const promptOutputDir = resolve(ctx.outputDir, "prompts")
				const docSet = documentSet ?? { documents: [], outputDir: "" }
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
			success: errors.filter((e) => !e.phase.includes("failed")).length === 0,
			outputDir: ctx.outputDir,
			duration: Date.now() - startTime,
			errors,
			usage: usage.getSummary(),
		}
	} finally {
		await resolved.cleanup()
	}
}

function createConcurrencyLimiter(limit: number) {
	let active = 0
	const queue: (() => void)[] = []

	function release() {
		active--
		if (queue.length > 0) {
			active++
			const next = queue.shift()
			if (next) next()
		}
	}

	return async <T>(fn: () => Promise<T>): Promise<T> => {
		if (active >= limit) {
			await new Promise<void>((resolve) => queue.push(resolve))
		} else {
			active++
		}
		try {
			return await fn()
		} finally {
			release()
		}
	}
}
