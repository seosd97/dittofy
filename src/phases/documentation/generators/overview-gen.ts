import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { DOC_GENERATOR_CONFIG } from "../../../llm/prompts/generators.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { overviewDocSchema } from "../../../llm/schemas/documentation.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { DesignEssence, TechStack } from "../../../types/analysis.js"
import type { DocumentEntry } from "../../../types/documentation.js"
import { assembleMarkdown } from "./assemble-markdown.js"

export async function generateOverviewDoc(
	techStack: TechStack,
	essence: DesignEssence,
	model: LanguageModel,
	usage: UsageTracker,
	language: "ko" | "en",
): Promise<DocumentEntry> {
	const system = buildSystemPrompt({ ...DOC_GENERATOR_CONFIG, outputLanguage: language })

	const prompt = `Generate a design overview document based on the following analysis:

## Tech Stack
${JSON.stringify(techStack, null, 2)}

## Design Essence
${JSON.stringify(essence, null, 2)}

Write a comprehensive overview that covers the project identity, tech stack, design philosophy, and key characteristics.`

	const result = await callLLM({
		model,
		preset: "docGenerator",
		system,
		prompt,
		schema: overviewDocSchema,
		schemaName: "overviewDoc",
		schemaDescription: "Design overview document",
	})

	usage.record("documentation", "overview-gen", result.usage)

	const content = assembleMarkdown("Design Overview", [
		{ title: "Identity", content: result.data.identity },
		{ title: "Tech Stack", content: result.data.techStack },
		{ title: "Design Philosophy", content: result.data.designPhilosophy },
		{ title: "Key Characteristics", content: result.data.keyCharacteristics },
	])

	return {
		filename: "00-overview.md",
		title: "Design Overview",
		content,
		category: "core",
	}
}
