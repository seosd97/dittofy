import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { DOC_GENERATOR_CONFIG } from "../../../llm/prompts/generators.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { tokensDocSchema } from "../../../llm/schemas/documentation.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { DesignEssence, DesignTokens } from "../../../types/analysis.js"
import type { DocumentEntry } from "../../../types/documentation.js"
import { assembleMarkdown } from "./assemble-markdown.js"

export async function generateTokensDoc(
	tokens: DesignTokens,
	essence: DesignEssence,
	model: LanguageModel,
	usage: UsageTracker,
	language: "ko" | "en",
): Promise<DocumentEntry> {
	const system = buildSystemPrompt({ ...DOC_GENERATOR_CONFIG, outputLanguage: language })

	const prompt = `Generate a design tokens document based on the following analysis:

## Design Tokens
${JSON.stringify(tokens, null, 2)}

## Design Essence
Color Strategy: ${essence.colorStrategy}

Write a comprehensive design tokens reference covering color palette, spacing scale, border radius, shadows, and other tokens.`

	const result = await callLLM({
		model,
		preset: "docGenerator",
		system,
		prompt,
		schema: tokensDocSchema,
		schemaName: "tokensDoc",
		schemaDescription: "Design tokens document",
	})

	usage.record("documentation", "tokens-gen", result.usage)

	const content = assembleMarkdown("Design Tokens", [
		{ title: "Color Palette", content: result.data.colorPalette },
		{ title: "Spacing", content: result.data.spacing },
		{ title: "Border Radius", content: result.data.borderRadius },
		{ title: "Shadows", content: result.data.shadows },
		{ title: "Other Tokens", content: result.data.otherTokens },
	])

	return {
		filename: "01-design-tokens.md",
		title: "Design Tokens",
		content,
		category: "core",
	}
}
