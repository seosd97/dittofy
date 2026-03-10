import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { buildContextForAnalyzer } from "../../../llm/context-builder.js"
import { INTERACTION_ANALYZER_CONFIG } from "../../../llm/prompts/analyzers.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { interactionPatternsSchema } from "../../../llm/schemas/analysis.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { InteractionPatterns } from "../../../types/analysis.js"
import type { ExtractionOutput } from "../../extraction/index.js"

export async function analyzeInteractions(
	extraction: ExtractionOutput,
	model: LanguageModel,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
): Promise<InteractionPatterns> {
	const context = buildContextForAnalyzer(
		"interaction",
		extraction.extraction.codeChunks,
		extraction.extraction.configFiles,
		extraction.extraction.fileTree,
	)

	const systemPrompt = buildSystemPrompt({ ...INTERACTION_ANALYZER_CONFIG, outputLanguage })

	const result = await callLLM({
		model,
		preset: "interactionAnalyzer",
		system: systemPrompt,
		prompt: `## Project File Structure\n${context.fileStructure}\n\n## Configuration Files\n${context.configContext}\n\n## Source Code\n${context.codeContext}`,
		schema: interactionPatternsSchema,
		schemaName: "InteractionPatterns",
		schemaDescription: "Interaction patterns extracted from the codebase",
	})

	usage.record("Phase 2", "Interaction Analyzer", result.usage)
	return result.data
}
