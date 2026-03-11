import type { DesignEssence, LayoutSystem } from "@defs/analysis.js"

export { LAYOUT_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildLayoutDocPrompt(
	data: LayoutSystem,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	return `Generate a layout system document based on the following analysis:

## Layout System
${JSON.stringify(data, null, 2)}

## Design Essence
Layout Strategy: ${essence.layoutStrategy}

Write a comprehensive layout system reference covering grid system, containers, navigation patterns, and visual hierarchy.`
}
