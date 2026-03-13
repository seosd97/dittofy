import type { DesignEssence, TypographySystem } from "@defs/analysis.js"

export { TYPOGRAPHY_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildTypographyDocPrompt(
	data: TypographySystem,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	const langInstruction =
		lang === "ko"
			? "Write all prose and descriptions in Korean. Use English for font names and CSS values."
			: "Write all content in English."

	return `Generate a typography reference document based on the following analysis.

${langInstruction}

## Design Essence
- Summary: ${essence.summary}
- Typography Strategy: ${essence.typographyStrategy}
- Design Philosophy: ${essence.designPhilosophy}

## Analyzed Typography System
${JSON.stringify(data, null, 2)}

## Output Structure
1. **Font Families** — List primary/secondary families with their roles (headings, body, code, etc.) and fallback stacks.
2. **Type Scale** — Present as a reference table: name, font-size, line-height, font-weight, usage context.
3. **Typography Principles** — Describe the typographic rhythm, hierarchy strategy, and design intent.

Focus on actionable reference: a developer should be able to reproduce the typographic system from this document alone.`
}
