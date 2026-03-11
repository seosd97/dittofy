import type { ComponentCatalog, DesignEssence } from "@defs/analysis.js"

export { COMPONENT_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildComponentsDocPrompt(
	data: ComponentCatalog,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	return `Generate a component catalog document based on the following analysis:

## Component Catalog
${JSON.stringify(data, null, 2)}

## Design Essence
Component Strategy: ${essence.componentStrategy}

Write a comprehensive component catalog covering an overview, detailed component list with variants and design notes, and composition patterns.`
}
