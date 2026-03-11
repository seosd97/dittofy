import type { DesignEssence, LayoutSystem } from "@defs/analysis.js"
import type { SystemPromptConfig } from "@llm/prompts/system.js"

export const LAYOUT_ANALYZER_CONFIG: SystemPromptConfig = {
	role: "You are a layout system analyst specializing in analyzing spatial organization patterns in frontend projects.",
	task: "Analyze the provided code to identify the layout system: grid approach (CSS Grid/Flexbox/hybrid), container strategy, spacing rhythm, navigation patterns, and visual hierarchy.",
	additionalPrinciples: [
		"Identify recurring layout patterns and their relationships.",
		"Describe the visual flow and information hierarchy.",
	],
}

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
