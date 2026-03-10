import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { DOC_GENERATOR_CONFIG } from "../../../llm/prompts/generators.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { responsiveDocSchema } from "../../../llm/schemas/documentation.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { DesignEssence, ResponsiveStrategy } from "../../../types/analysis.js"
import type { DocumentEntry } from "../../../types/documentation.js"
import { assembleMarkdown } from "./assemble-markdown.js"

export async function generateResponsiveDoc(
	responsive: ResponsiveStrategy,
	essence: DesignEssence,
	model: LanguageModel,
	usage: UsageTracker,
	language: "ko" | "en",
): Promise<DocumentEntry> {
	const system = buildSystemPrompt({ ...DOC_GENERATOR_CONFIG, outputLanguage: language })

	const prompt = `Generate a responsive strategy document based on the following analysis:

## Responsive Strategy
${JSON.stringify(responsive, null, 2)}

## Design Essence
Summary: ${essence.summary}

Write a comprehensive responsive strategy reference covering the approach, breakpoints reference table, and responsive patterns.`

	const result = await callLLM({
		model,
		preset: "docGenerator",
		system,
		prompt,
		schema: responsiveDocSchema,
		schemaName: "responsiveDoc",
		schemaDescription: "Responsive strategy document",
	})

	usage.record("documentation", "responsive-gen", result.usage)

	const content = assembleMarkdown("Responsive Strategy", [
		{ title: "Approach", content: result.data.approach },
		{ title: "Breakpoints", content: result.data.breakpoints },
		{ title: "Responsive Patterns", content: result.data.patterns },
	])

	return {
		filename: "06-responsive-strategy.md",
		title: "Responsive Strategy",
		content,
		category: "dynamic",
	}
}
