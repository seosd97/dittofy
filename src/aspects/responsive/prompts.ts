import type { DesignEssence, ResponsiveStrategy } from "@defs/analysis.js"

export { RESPONSIVE_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildResponsiveDocPrompt(
	data: ResponsiveStrategy,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	const langInstruction =
		lang === "ko"
			? "Write all prose and descriptions in Korean. Use English for breakpoint values and CSS terms."
			: "Write all content in English."

	return `Generate a responsive strategy reference document based on the following analysis.

${langInstruction}

## Design Essence
- Summary: ${essence.summary}
- Layout Strategy: ${essence.layoutStrategy}
- Design Philosophy: ${essence.designPhilosophy}

## Analyzed Responsive Strategy
${JSON.stringify(data, null, 2)}

## Output Structure
1. **Approach** — Describe the overall responsive approach (mobile-first or desktop-first) and the rationale behind it.
2. **Breakpoints** — Present breakpoints as a reference table: name, value, and what changes at each breakpoint.
3. **Responsive Patterns** — Describe extracted responsive patterns: how layout, typography, and spacing adapt across breakpoints.

These patterns will be applied to showcase pages (Home, About), not to replicate the source project's responsive behavior.`
}
