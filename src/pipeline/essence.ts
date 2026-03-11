import type { DesignEssence } from "@defs/analysis.js"
import type { AnalysisResultMap } from "@defs/aspect-map.js"
import { buildAnalysisSummary } from "@llm/context.js"
import { callLLM } from "@llm/core/client.js"
import { ESSENCE_SYNTHESIZER_CONFIG } from "@llm/prompts/analyzers.js"
import { buildSystemPrompt } from "@llm/prompts/system.js"
import { designEssenceSchema } from "@llm/schemas/analysis.js"
import type { UsageTracker } from "@llm/usage.js"
import type { LanguageModel } from "ai"

export async function synthesizeEssence(
	results: AnalysisResultMap,
	model: LanguageModel,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
): Promise<DesignEssence> {
	const systemPrompt = buildSystemPrompt({ ...ESSENCE_SYNTHESIZER_CONFIG, outputLanguage })

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

	usage.record("Analysis", "Essence Synthesizer", result.usage)
	return result.data
}
