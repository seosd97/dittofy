import type { ComponentCatalog, DesignEssence } from "@defs/analysis.js"

export { COMPONENT_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildComponentsDocPrompt(
	data: ComponentCatalog,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	const langInstruction =
		lang === "ko"
			? "Write all prose and descriptions in Korean. Use English for component names and prop types."
			: "Write all content in English."

	return `Generate a component pattern reference document based on the following analysis.

This is a **design pattern reference**, NOT an implementation catalog. The purpose is to document the component patterns found in the source project so they can inform new design system implementations. No component implementation step exists — this document serves as supplementary reference material.

${langInstruction}

## Design Essence
- Summary: ${essence.summary}
- Component Strategy: ${essence.componentStrategy}
- Design Philosophy: ${essence.designPhilosophy}

## Analyzed Components
${JSON.stringify(data, null, 2)}

## Output Structure
1. **Overview** — Summarize the component architecture patterns: atomic design distribution, tier breakdown (core/design-system/domain), and overall design approach.
2. **Component Inventory** — List components grouped by tier. For each: name, category, key variants, and design intent. Emphasize visual character over implementation details.
3. **Composition Patterns** — Describe how components are composed together and recurring layout/interaction patterns.

Focus on design patterns and visual language, not on technical implementation details.`
}
