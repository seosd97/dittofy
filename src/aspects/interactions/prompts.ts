import type { DesignEssence, InteractionPatterns } from "@defs/analysis.js"

export { INTERACTION_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildInteractionsDocPrompt(
	data: InteractionPatterns,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	const langInstruction =
		lang === "ko"
			? "Write all prose and descriptions in Korean. Use English for CSS values and animation terms."
			: "Write all content in English."

	return `Generate an interaction patterns reference document based on the following analysis.

${langInstruction}

## Design Essence
- Summary: ${essence.summary}
- Interaction Strategy: ${essence.interactionStrategy}
- Design Philosophy: ${essence.designPhilosophy}

## Analyzed Interaction Patterns
${JSON.stringify(data, null, 2)}

## Output Structure
1. **Motion Style** — Describe the overall motion personality (restrained, moderate, expressive) and design intent.
2. **Animations** — List animation patterns with type, description, and suggested timing/easing values.
3. **Transitions** — List transition defaults: property, duration, easing.
4. **Interaction Principles** — Describe the guiding principles for interaction design (feedback, responsiveness, consistency).

These patterns will be applied to showcase pages (Home, About), not to replicate the source project's exact animations.`
}
