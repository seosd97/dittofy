import type { LanguageModel } from "ai"
import { callLLM } from "../../llm/client.js"
import { buildAnalysisSummary } from "../../llm/context-builder.js"
import { ESSENCE_SYNTHESIZER_CONFIG } from "../../llm/prompts/analyzers.js"
import { buildSystemPrompt } from "../../llm/prompts/system.js"

import { designEssenceSchema } from "../../llm/schemas/analysis.js"
import type { UsageTracker } from "../../llm/usage.js"
import type {
	ComponentCatalog,
	DesignEssence,
	DesignTokens,
	InteractionPatterns,
	LayoutSystem,
	PageStructures,
	ResponsiveStrategy,
	TypographySystem,
} from "../../types/analysis.js"

export interface AnalysisResults {
	designTokens: DesignTokens | null
	typography: TypographySystem | null
	componentCatalog: ComponentCatalog | null
	layoutSystem: LayoutSystem | null
	pageStructures: PageStructures | null
	responsiveStrategy: ResponsiveStrategy | null
	interactionPatterns: InteractionPatterns | null
}

export async function synthesizeEssence(
	results: AnalysisResults,
	model: LanguageModel,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
): Promise<DesignEssence> {
	const systemPrompt = buildSystemPrompt({ ...ESSENCE_SYNTHESIZER_CONFIG, outputLanguage })

	// Filter out null (failed) results and note which failed
	const available: Record<string, unknown> = {}
	const failed: string[] = []

	for (const [key, value] of Object.entries(results)) {
		if (value != null) {
			available[key] = value
		} else {
			failed.push(key)
		}
	}

	const analysisSummary = buildAnalysisSummary(available)
	const failedNote =
		failed.length > 0
			? `\n\n## Note\nThe following analyses failed and have no data: ${failed.join(", ")}. Do NOT assume these aspects are absent — they simply could not be analyzed.`
			: ""

	const result = await callLLM({
		model,
		preset: "essenceSynthesizer",
		system: systemPrompt,
		prompt: `## Analysis Results\n${analysisSummary}${failedNote}`,
		schema: designEssenceSchema,
		schemaName: "DesignEssence",
		schemaDescription: "Synthesized design essence from all analysis results",
	})

	usage.record("Phase 2", "Essence Synthesizer", result.usage)
	return result.data
}
