import type { ComponentCatalog, DesignEssence } from "@defs/analysis.js"
import type { SystemPromptConfig } from "@llm/prompts/system.js"

export const COMPONENT_ANALYZER_CONFIG: SystemPromptConfig = {
	role: "You are a UI component analyst specializing in analyzing component architecture and design patterns in frontend projects.",
	task: "Analyze the provided components to catalog each one: its atomic design category (atom/molecule/organism/template), props interface, visual variants, states, and design description. Identify component composition patterns.",
	additionalPrinciples: [
		"Classify components using atomic design methodology based on their complexity and composition.",
		"Describe the visual character and design intent of each component, not just its technical structure.",
	],
}

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
