import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { buildContextForAnalyzer } from "../../../llm/context-builder.js"
import { RESPONSIVE_ANALYZER_CONFIG } from "../../../llm/prompts/analyzers.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { responsiveStrategySchema } from "../../../llm/schemas/analysis.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { ResponsiveStrategy } from "../../../types/analysis.js"
import type { ExtractionOutput } from "../../extraction/index.js"

export async function analyzeResponsive(
	extraction: ExtractionOutput,
	model: LanguageModel,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
): Promise<ResponsiveStrategy> {
	const context = buildContextForAnalyzer(
		"responsive",
		extraction.extraction.codeChunks,
		extraction.extraction.configFiles,
		extraction.extraction.fileTree,
	)

	const systemPrompt = buildSystemPrompt({ ...RESPONSIVE_ANALYZER_CONFIG, outputLanguage })

	const result = await callLLM({
		model,
		preset: "responsiveAnalyzer",
		system: systemPrompt,
		prompt: `## Project File Structure\n${context.fileStructure}\n\n## Configuration Files\n${context.configContext}\n\n## Source Code\n${context.codeContext}`,
		schema: responsiveStrategySchema,
		schemaName: "ResponsiveStrategy",
		schemaDescription: "Responsive strategy extracted from the codebase",
	})

	usage.record("Phase 2", "Responsive Analyzer", result.usage)
	return result.data
}
