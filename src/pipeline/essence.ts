import type { DesignEssence } from "@defs/analysis.js"
import type { AnalysisResultMap } from "@defs/aspect-map.js"
import type { ILLMClient } from "@llm/client.js"
import { ESSENCE_SYNTHESIZER_CONFIG, buildSystemPrompt } from "@llm/prompts.js"
import type { UsageTracker } from "@llm/usage.js"
import type { ReconciliationReport } from "@pipeline/reconciliation.js"
import { z } from "zod"
import { summarizeResults } from "./aspect-summarizer.js"

export const designEssenceSchema = z.object({
	summary: z.string().describe("One-line summary of the design identity"),
	designPhilosophy: z.string().describe("Core design philosophy in 2-3 sentences"),
	keyCharacteristics: z.array(z.string()).describe("3-5 key visual characteristics"),
	colorStrategy: z.string().describe("Color usage strategy"),
	typographyStrategy: z.string().describe("Typography approach"),
	layoutStrategy: z.string().describe("Layout approach"),
	componentStrategy: z.string().describe("Component design approach"),
	interactionStrategy: z.string().describe("Interaction/motion approach"),
	appType: z.enum(["marketing", "dashboard", "ecommerce", "content", "social", "utility"]),
})

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
