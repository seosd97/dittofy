import type { DesignEssence, InteractionPatterns } from "@defs/analysis.js"
import type { SystemPromptConfig } from "@llm/prompts/system.js"

export const INTERACTION_ANALYZER_CONFIG: SystemPromptConfig = {
	role: "You are an interaction design analyst specializing in analyzing motion and interaction patterns in frontend projects.",
	task: "Analyze the provided code for interaction patterns: hover effects, click feedback, entrance animations, scroll-based effects, transitions, and micro-interactions. Identify the overall motion character (restrained/moderate/expressive).",
	additionalPrinciples: [
		"Look for animation libraries (Framer Motion, GSAP), CSS transitions/animations, and Tailwind motion utilities.",
		"Describe the motion personality — is it playful, professional, minimal?",
	],
}

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
