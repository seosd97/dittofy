import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { buildContextForAnalyzer } from "../../../llm/context-builder.js"
import { LAYOUT_ANALYZER_CONFIG } from "../../../llm/prompts/analyzers.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { layoutSystemSchema } from "../../../llm/schemas/analysis.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { LayoutSystem } from "../../../types/analysis.js"
import type { ExtractionOutput } from "../../extraction/index.js"

export async function analyzeLayout(
	extraction: ExtractionOutput,
	model: LanguageModel,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
): Promise<LayoutSystem> {
	const context = buildContextForAnalyzer(
		"layout",
		extraction.extraction.codeChunks,
		extraction.extraction.configFiles,
		extraction.extraction.fileTree,
	)

	const systemPrompt = buildSystemPrompt({ ...LAYOUT_ANALYZER_CONFIG, outputLanguage })

	const result = await callLLM({
		model,
		preset: "layoutAnalyzer",
		system: systemPrompt,
		prompt: `## Project File Structure\n${context.fileStructure}\n\n## Configuration Files\n${context.configContext}\n\n## Source Code\n${context.codeContext}`,
		schema: layoutSystemSchema,
		schemaName: "LayoutSystem",
		schemaDescription: "Layout system extracted from the codebase",
	})

	usage.record("Phase 2", "Layout Analyzer", result.usage)
	return result.data
}
