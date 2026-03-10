import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { buildContextForAnalyzer } from "../../../llm/context-builder.js"
import { TYPOGRAPHY_ANALYZER_CONFIG } from "../../../llm/prompts/analyzers.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { typographySystemSchema } from "../../../llm/schemas/analysis.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { TypographySystem } from "../../../types/analysis.js"
import type { ExtractionOutput } from "../../extraction/index.js"

export async function analyzeTypography(
	extraction: ExtractionOutput,
	model: LanguageModel,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
): Promise<TypographySystem> {
	const context = buildContextForAnalyzer(
		"typography",
		extraction.extraction.codeChunks,
		extraction.extraction.configFiles,
		extraction.extraction.fileTree,
	)

	const systemPrompt = buildSystemPrompt({ ...TYPOGRAPHY_ANALYZER_CONFIG, outputLanguage })

	const result = await callLLM({
		model,
		preset: "typographyAnalyzer",
		system: systemPrompt,
		prompt: `## Project File Structure\n${context.fileStructure}\n\n## Configuration Files\n${context.configContext}\n\n## Source Code\n${context.codeContext}`,
		schema: typographySystemSchema,
		schemaName: "TypographySystem",
		schemaDescription: "Typography system extracted from the codebase",
	})

	usage.record("Phase 2", "Typography Analyzer", result.usage)
	return result.data
}
