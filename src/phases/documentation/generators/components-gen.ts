import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { DOC_GENERATOR_CONFIG } from "../../../llm/prompts/generators.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { componentsDocSchema } from "../../../llm/schemas/documentation.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { ComponentCatalog, DesignEssence } from "../../../types/analysis.js"
import type { DocumentEntry } from "../../../types/documentation.js"
import { assembleMarkdown } from "./assemble-markdown.js"

export async function generateComponentsDoc(
	catalog: ComponentCatalog,
	essence: DesignEssence,
	model: LanguageModel,
	usage: UsageTracker,
	language: "ko" | "en",
): Promise<DocumentEntry> {
	const system = buildSystemPrompt({ ...DOC_GENERATOR_CONFIG, outputLanguage: language })

	const prompt = `Generate a component catalog document based on the following analysis:

## Component Catalog
${JSON.stringify(catalog, null, 2)}

## Design Essence
Component Strategy: ${essence.componentStrategy}

Write a comprehensive component catalog covering an overview, detailed component list with variants and design notes, and composition patterns.`

	const result = await callLLM({
		model,
		preset: "docGenerator",
		system,
		prompt,
		schema: componentsDocSchema,
		schemaName: "componentsDoc",
		schemaDescription: "Component catalog document",
	})

	usage.record("documentation", "components-gen", result.usage)

	const content = assembleMarkdown("Component Catalog", [
		{ title: "Overview", content: result.data.overview },
		{ title: "Components", content: result.data.componentList },
		{ title: "Composition Patterns", content: result.data.patterns },
	])

	return {
		filename: "03-component-catalog.md",
		title: "Component Catalog",
		content,
		category: "core",
	}
}
