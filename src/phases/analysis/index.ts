import type { LanguageModel } from "ai"
import { ANALYSIS } from "../../constants/analysis.js"
import type { UsageTracker } from "../../llm/usage.js"
import type {
	AnalysisResult,
	ComponentCatalog,
	DesignEssence,
	DesignTokens,
	InteractionPatterns,
	LayoutSystem,
	PageStructures,
	ResponsiveStrategy,
	TypographySystem,
} from "../../types/analysis.js"
import type { PhaseError } from "../../types/pipeline.js"
import type { PhaseResult } from "../../types/pipeline.js"
import { logger, phaseFail, phaseStart, phaseSuccess } from "../../utils/logger.js"
import type { ExtractionOutput } from "../extraction/index.js"
import { analyzeComponents } from "./analyzers/component-analyzer.js"
import { analyzeInteractions } from "./analyzers/interaction-analyzer.js"
import { analyzeLayout } from "./analyzers/layout-analyzer.js"
import { analyzePages } from "./analyzers/page-analyzer.js"
import { analyzeResponsive } from "./analyzers/responsive-analyzer.js"
import { analyzeTokens } from "./analyzers/token-analyzer.js"
import { analyzeTypography } from "./analyzers/typography-analyzer.js"
import { synthesizeEssence } from "./essence-synthesizer.js"

export async function runAnalysis(
	extraction: ExtractionOutput,
	model: LanguageModel,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
): Promise<PhaseResult<AnalysisResult>> {
	const startTime = Date.now()
	const errors: PhaseError[] = []

	phaseStart("Phase 2", `Running ${ANALYSIS.totalAnalyzers} design analyzers (concurrency: ${ANALYSIS.concurrency})`)

	// Run all analyzers with concurrency limit to avoid rate limiting
	const withLimit = createConcurrencyLimiter(ANALYSIS.concurrency)
	const lang = outputLanguage
	const [
		tokensResult,
		typographyResult,
		componentsResult,
		layoutResult,
		pagesResult,
		responsiveResult,
		interactionsResult,
	] = await Promise.allSettled([
		withLimit(() => analyzeTokens(extraction, model, usage, lang)),
		withLimit(() => analyzeTypography(extraction, model, usage, lang)),
		withLimit(() => analyzeComponents(extraction, model, usage, lang)),
		withLimit(() => analyzeLayout(extraction, model, usage, lang)),
		withLimit(() => analyzePages(extraction, model, usage, lang)),
		withLimit(() => analyzeResponsive(extraction, model, usage, lang)),
		withLimit(() => analyzeInteractions(extraction, model, usage, lang)),
	])

	// Extract results, using null for failed analyzers
	const designTokens = extractResult<DesignTokens>(tokensResult, "Token Analyzer", errors)
	const typography = extractResult<TypographySystem>(
		typographyResult,
		"Typography Analyzer",
		errors,
	)
	const componentCatalog = extractResult<ComponentCatalog>(
		componentsResult,
		"Component Analyzer",
		errors,
	)
	const layoutSystem = extractResult<LayoutSystem>(layoutResult, "Layout Analyzer", errors)
	const pageStructures = extractResult<PageStructures>(pagesResult, "Page Analyzer", errors)
	const responsiveStrategy = extractResult<ResponsiveStrategy>(
		responsiveResult,
		"Responsive Analyzer",
		errors,
	)
	const interactionPatterns = extractResult<InteractionPatterns>(
		interactionsResult,
		"Interaction Analyzer",
		errors,
	)

	const analyzerResults = {
		designTokens,
		typography,
		componentCatalog,
		layoutSystem,
		pageStructures,
		responsiveStrategy,
		interactionPatterns,
	}

	const allNames = Object.keys(analyzerResults) as (keyof typeof analyzerResults)[]
	const failedAnalyzers = allNames.filter((k) => analyzerResults[k] === null)
	const succeededCount = allNames.length - failedAnalyzers.length

	logger.info(`Phase 2: ${succeededCount}/${ANALYSIS.totalAnalyzers} analyzers completed successfully`)

	if (succeededCount === 0) {
		phaseFail("Phase 2", "All analyzers failed")
		return {
			status: "failed",
			errors,
			duration: Date.now() - startTime,
		}
	}

	if (succeededCount < ANALYSIS.minAnalyzersRequired) {
		phaseFail("Phase 2", `Only ${succeededCount}/${ANALYSIS.totalAnalyzers} succeeded (minimum: ${ANALYSIS.minAnalyzersRequired})`)
		return {
			status: "failed",
			errors,
			duration: Date.now() - startTime,
		}
	}

	// Run Essence Synthesizer sequentially after analyzers
	phaseStart("Phase 2", "Synthesizing design essence")

	let essence: DesignEssence | null = null
	try {
		essence = await synthesizeEssence(analyzerResults, model, usage, lang)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		errors.push({ phase: "Essence Synthesizer", message })
		logger.warn(`Essence Synthesizer failed: ${message}`)
	}

	if (!essence) {
		phaseFail("Phase 2", "Essence synthesis failed")
		return {
			status: "failed",
			errors,
			duration: Date.now() - startTime,
		}
	}

	const status = succeededCount === ANALYSIS.totalAnalyzers ? "completed" : "partial"
	phaseSuccess("Phase 2", `Analysis ${status} in ${Date.now() - startTime}ms`)

	return {
		status,
		data: {
			techStack: extraction.techStack,
			...analyzerResults,
			essence,
			failedAnalyzers: failedAnalyzers.map(String),
		},
		errors,
		duration: Date.now() - startTime,
	}
}

function extractResult<T>(
	result: PromiseSettledResult<T>,
	analyzerName: string,
	errors: PhaseError[],
): T | null {
	if (result.status === "fulfilled") {
		return result.value
	}

	const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
	errors.push({ phase: analyzerName, message, cause: result.reason })
	logger.warn(`${analyzerName} failed: ${message}`)
	return null
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
