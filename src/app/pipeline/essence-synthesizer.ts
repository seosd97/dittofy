import type { DesignEssence } from "@defs/analysis.js"
import type { AnalysisResultMap } from "@defs/aspect-map.js"
import { designEssenceSchema } from "@domain/analysis/essence-schema.js"
import type { ReconciliationReport } from "@domain/analysis/reconciliation.js"
import { ESSENCE_SYNTHESIZER_CONFIG, buildSystemPrompt } from "@domain/llm-prompts/index.js"
import { summarizeResults } from "@domain/rendering/aspect-summarizer.js"
import type { ILLMClient } from "@infra/llm/client.js"
import type { UsageTracker } from "@infra/llm/usage.js"

// Re-export schema from domain
export { designEssenceSchema } from "@domain/analysis/essence-schema.js"

export async function synthesizeEssence(
	results: AnalysisResultMap,
	client: ILLMClient,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
	reconciliation?: ReconciliationReport,
): Promise<DesignEssence> {
	const systemPrompt = buildSystemPrompt({ ...ESSENCE_SYNTHESIZER_CONFIG, outputLanguage })

	const sections = summarizeResults(results)
	const summary = ["# Analysis Results\n", ...sections].join("\n\n")

	const failed: string[] = []
	for (const [key, value] of Object.entries(results)) {
		if (value == null) failed.push(key)
	}

	const failedNote =
		failed.length > 0
			? `\n\n## Note\nThe following analyses failed and have no data: ${failed.join(", ")}. Do NOT assume these aspects are absent — they simply could not be analyzed.`
			: ""

	let reconciliationNote = ""
	if (reconciliation && reconciliation.conflicts.length > 0) {
		const conflictNotes = reconciliation.conflicts
			.map(
				(c) =>
					`- ${c.field}: token="${c.tokenValue}" vs ${c.otherAspect}="${c.otherValue}" (token wins)`,
			)
			.join("\n")
		reconciliationNote = `\n\n## Cross-Aspect Conflict Resolutions\n${conflictNotes}`
	}

	const result = await client.call({
		preset: "essenceSynthesizer",
		system: systemPrompt,
		prompt: `${summary}${failedNote}${reconciliationNote}`,
		schema: designEssenceSchema,
		schemaName: "DesignEssence",
		schemaDescription: "Synthesized design essence from all analysis results",
	})

	usage.record("Analysis", "Essence Synthesizer", result.usage)
	return result.data
}
