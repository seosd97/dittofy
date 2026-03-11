import type { DesignEssence } from "@defs/analysis.js"
import type { AspectName, AspectTypeMap } from "@defs/aspect-map.js"
import type { AspectDescriptor } from "@defs/descriptor.js"
import type { DocumentEntry } from "@defs/documentation.js"
import { callLLM } from "@llm/core/client.js"
import { DOC_GENERATOR_CONFIG } from "@llm/prompts/generators.js"
import { ANALYSIS_PRINCIPLES, buildSystemPrompt } from "@llm/prompts/system.js"
import type { UsageTracker } from "@llm/usage.js"
import type { LanguageModel } from "ai"

/**
 * 제네릭 doc generator runner.
 * AspectDescriptor의 docGenerator 설정을 받아 문서 생성.
 */
export async function runDocGenerator<K extends AspectName>(
	descriptor: AspectDescriptor<K>,
	data: AspectTypeMap[K],
	essence: DesignEssence,
	model: LanguageModel,
	usage: UsageTracker,
	language: "ko" | "en" = "ko",
): Promise<DocumentEntry> {
	const { docGenerator } = descriptor
	const systemPrompt = buildSystemPrompt({
		...DOC_GENERATOR_CONFIG,
		additionalPrinciples: [
			...ANALYSIS_PRINCIPLES,
			...(DOC_GENERATOR_CONFIG.additionalPrinciples ?? []),
		],
		outputLanguage: language,
	})
	const prompt = docGenerator.buildPrompt(data, essence, language)

	const result = await callLLM({
		model,
		preset: "docGenerator",
		system: systemPrompt,
		prompt,
		schema: docGenerator.schema,
		schemaName: docGenerator.schemaName,
		schemaDescription: docGenerator.schemaDescription,
	})

	usage.record("Documentation", `${descriptor.displayName} Doc`, result.usage)

	const content = docGenerator.assembleDoc(docGenerator.title, result.data)
	return {
		filename: docGenerator.filename,
		title: docGenerator.title,
		content,
		category: docGenerator.category,
	}
}
