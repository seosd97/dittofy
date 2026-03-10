import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { DOC_GENERATOR_CONFIG } from "../../../llm/prompts/generators.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { interactionsDocSchema } from "../../../llm/schemas/documentation.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { DesignEssence, InteractionPatterns } from "../../../types/analysis.js"
import type { DocumentEntry } from "../../../types/documentation.js"
import { assembleMarkdown } from "./assemble-markdown.js"

export async function generateInteractionsDoc(
	interactions: InteractionPatterns,
	essence: DesignEssence,
	model: LanguageModel,
	usage: UsageTracker,
	language: "ko" | "en",
): Promise<DocumentEntry> {
	const system = buildSystemPrompt({ ...DOC_GENERATOR_CONFIG, outputLanguage: language })

	const prompt = `Generate an interactions document based on the following analysis:

## Interaction Patterns
${JSON.stringify(interactions, null, 2)}

## Design Essence
Interaction Strategy: ${essence.interactionStrategy}

Write a comprehensive interactions reference covering overall motion style, animation patterns, transition defaults, and interaction design principles.`

	const result = await callLLM({
		model,
		preset: "docGenerator",
		system,
		prompt,
		schema: interactionsDocSchema,
		schemaName: "interactionsDoc",
		schemaDescription: "Interactions document",
	})

	usage.record("documentation", "interactions-gen", result.usage)

	const content = assembleMarkdown("Interactions", [
		{ title: "Motion Style", content: result.data.motionStyle },
		{ title: "Animations", content: result.data.animations },
		{ title: "Transitions", content: result.data.transitions },
		{ title: "Interaction Principles", content: result.data.principles },
	])

	return {
		filename: "07-interactions.md",
		title: "Interactions",
		content,
		category: "dynamic",
	}
}
