import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { buildContextForAnalyzer } from "../../../llm/context-builder.js"
import { TOKEN_ANALYZER_CONFIG } from "../../../llm/prompts/analyzers.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { designTokensSchema } from "../../../llm/schemas/analysis.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { DesignTokens } from "../../../types/analysis.js"
import type { ExtractionOutput } from "../../extraction/index.js"

export async function analyzeTokens(
	extraction: ExtractionOutput,
	model: LanguageModel,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
): Promise<DesignTokens> {
	const context = buildContextForAnalyzer(
		"token",
		extraction.extraction.codeChunks,
		extraction.extraction.configFiles,
		extraction.extraction.fileTree,
	)

	const systemPrompt = buildSystemPrompt({ ...TOKEN_ANALYZER_CONFIG, outputLanguage })

	const result = await callLLM({
		model,
		preset: "tokenAnalyzer",
		system: systemPrompt,
		prompt: `## Project File Structure\n${context.fileStructure}\n\n## Configuration Files\n${context.configContext}\n\n## Source Code\n${context.codeContext}`,
		schema: designTokensSchema,
		schemaName: "DesignTokens",
		schemaDescription: "Design tokens extracted from the codebase",
	})

	usage.record("Phase 2", "Token Analyzer", result.usage)
	return result.data
}
