import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { DOC_GENERATOR_CONFIG } from "../../../llm/prompts/generators.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { typographyDocSchema } from "../../../llm/schemas/documentation.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { DesignEssence, TypographySystem } from "../../../types/analysis.js"
import type { DocumentEntry } from "../../../types/documentation.js"
import { assembleMarkdown } from "./assemble-markdown.js"

export async function generateTypographyDoc(
	typography: TypographySystem,
	essence: DesignEssence,
	model: LanguageModel,
	usage: UsageTracker,
	language: "ko" | "en",
): Promise<DocumentEntry> {
	const system = buildSystemPrompt({ ...DOC_GENERATOR_CONFIG, outputLanguage: language })

	const prompt = `Generate a typography document based on the following analysis:

## Typography System
${JSON.stringify(typography, null, 2)}

## Design Essence
Typography Strategy: ${essence.typographyStrategy}

Write a comprehensive typography reference covering font families, type scale, and typography principles.`

	const result = await callLLM({
		model,
		preset: "docGenerator",
		system,
		prompt,
		schema: typographyDocSchema,
		schemaName: "typographyDoc",
		schemaDescription: "Typography document",
	})

	usage.record("documentation", "typography-gen", result.usage)

	const content = assembleMarkdown("Typography", [
		{ title: "Font Families", content: result.data.fontFamilies },
		{ title: "Type Scale", content: result.data.typeScale },
		{ title: "Typography Principles", content: result.data.principles },
	])

	return {
		filename: "02-typography.md",
		title: "Typography",
		content,
		category: "core",
	}
}
