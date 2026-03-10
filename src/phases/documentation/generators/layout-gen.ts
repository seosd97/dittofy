import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { DOC_GENERATOR_CONFIG } from "../../../llm/prompts/generators.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { layoutDocSchema } from "../../../llm/schemas/documentation.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { DesignEssence, LayoutSystem } from "../../../types/analysis.js"
import type { DocumentEntry } from "../../../types/documentation.js"
import { assembleMarkdown } from "./assemble-markdown.js"

export async function generateLayoutDoc(
	layout: LayoutSystem,
	essence: DesignEssence,
	model: LanguageModel,
	usage: UsageTracker,
	language: "ko" | "en",
): Promise<DocumentEntry> {
	const system = buildSystemPrompt({ ...DOC_GENERATOR_CONFIG, outputLanguage: language })

	const prompt = `Generate a layout system document based on the following analysis:

## Layout System
${JSON.stringify(layout, null, 2)}

## Design Essence
Layout Strategy: ${essence.layoutStrategy}

Write a comprehensive layout system reference covering grid system, containers, navigation patterns, and visual hierarchy.`

	const result = await callLLM({
		model,
		preset: "docGenerator",
		system,
		prompt,
		schema: layoutDocSchema,
		schemaName: "layoutDoc",
		schemaDescription: "Layout system document",
	})

	usage.record("documentation", "layout-gen", result.usage)

	const content = assembleMarkdown("Layout System", [
		{ title: "Grid System", content: result.data.gridSystem },
		{ title: "Containers", content: result.data.containers },
		{ title: "Navigation", content: result.data.navigation },
		{ title: "Visual Hierarchy", content: result.data.hierarchy },
	])

	return {
		filename: "04-layout-system.md",
		title: "Layout System",
		content,
		category: "core",
	}
}
