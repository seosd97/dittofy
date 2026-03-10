import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { buildContextForAnalyzer } from "../../../llm/context-builder.js"
import { COMPONENT_ANALYZER_CONFIG } from "../../../llm/prompts/analyzers.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { componentCatalogSchema } from "../../../llm/schemas/analysis.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { ComponentCatalog } from "../../../types/analysis.js"
import type { ExtractionOutput } from "../../extraction/index.js"

export async function analyzeComponents(
	extraction: ExtractionOutput,
	model: LanguageModel,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
): Promise<ComponentCatalog> {
	const context = buildContextForAnalyzer(
		"component",
		extraction.extraction.codeChunks,
		extraction.extraction.configFiles,
		extraction.extraction.fileTree,
	)

	const systemPrompt = buildSystemPrompt({ ...COMPONENT_ANALYZER_CONFIG, outputLanguage })

	const result = await callLLM({
		model,
		preset: "componentAnalyzer",
		system: systemPrompt,
		prompt: `## Project File Structure\n${context.fileStructure}\n\n## Configuration Files\n${context.configContext}\n\n## Source Code\n${context.codeContext}`,
		schema: componentCatalogSchema,
		schemaName: "ComponentCatalog",
		schemaDescription: "Component catalog extracted from the codebase",
	})

	usage.record("Phase 2", "Component Analyzer", result.usage)
	return result.data
}
