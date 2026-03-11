import type { DesignEssence, InteractionPatterns } from "@defs/analysis.js"

export { INTERACTION_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildInteractionsDocPrompt(
	data: InteractionPatterns,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	return `Generate an interactions document based on the following analysis:

## Interaction Patterns
${JSON.stringify(data, null, 2)}

## Design Essence
Interaction Strategy: ${essence.interactionStrategy}

Write a comprehensive interactions reference covering overall motion style, animation patterns, transition defaults, and interaction design principles.`
}
