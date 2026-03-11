import type { AspectName } from "@defs/aspect-map.js"
import type { AspectDescriptor } from "@defs/descriptor.js"
import { buildContextForAnalyzer } from "@llm/context.js"
import { callLLM } from "@llm/core/client.js"
import { ANALYSIS_PRINCIPLES, buildSystemPrompt } from "@llm/prompts/system.js"
import type { UsageTracker } from "@llm/usage.js"
import type { ExtractionOutput } from "@source/index.js"
import type { LanguageModel } from "ai"

/**
 * 제네릭 analyzer runner.
 * AspectDescriptor의 analyzer 설정을 받아 LLM 호출 → 사용량 기록 → 결과 반환.
 */
export async function runAnalyzer<K extends AspectName>(
	descriptor: AspectDescriptor<K>,
	extraction: ExtractionOutput,
	model: LanguageModel,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
): Promise<import("@defs/aspect-map.js").AspectTypeMap[K]> {
	const { analyzer } = descriptor

	const context = buildContextForAnalyzer(
		analyzer.contextConfig,
		extraction.extraction.codeChunks,
		extraction.extraction.configFiles,
		extraction.extraction.fileTree,
	)

	const systemPrompt = buildSystemPrompt({
		...analyzer.promptConfig,
		additionalPrinciples: [
			...ANALYSIS_PRINCIPLES,
			...(analyzer.promptConfig.additionalPrinciples ?? []),
		],
		outputLanguage,
	})

	const result = await callLLM({
		model,
		preset: analyzer.preset,
		system: systemPrompt,
		prompt: `## Project File Structure\n${context.fileStructure}\n\n## Configuration Files\n${context.configContext}\n\n## Source Code\n${context.codeContext}`,
		schema: analyzer.schema,
		schemaName: analyzer.schemaName,
		schemaDescription: analyzer.schemaDescription,
	})

	usage.record("Analysis", descriptor.displayName, result.usage)
	return result.data
}
