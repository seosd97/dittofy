import type { DesignEssence, LayoutSystem } from "@defs/analysis.js"

export { LAYOUT_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildLayoutDocPrompt(
	data: LayoutSystem,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	const langInstruction =
		lang === "ko"
			? "Write all prose and descriptions in Korean. Use English for CSS values and technical terms."
			: "Write all content in English."

	return `Generate a layout system reference document based on the following analysis.

${langInstruction}

## Design Essence
- Summary: ${essence.summary}
- Layout Strategy: ${essence.layoutStrategy}
- Design Philosophy: ${essence.designPhilosophy}

## Analyzed Layout System
${JSON.stringify(data, null, 2)}

## Output Structure
1. **Grid System** — Describe the grid approach (CSS Grid, Flexbox, hybrid), column structure, and gap values.
2. **Containers** — List container types with max-width and padding values.
3. **Navigation Patterns** — Describe navigation structure and behavior.
4. **Visual Hierarchy** — Describe how spatial organization creates information hierarchy.

Focus on the structural skeleton: a developer should be able to build the page layout shell from this document.`
}
