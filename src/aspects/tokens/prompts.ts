import type { DesignEssence, DesignTokens } from "@defs/analysis.js"

export { TOKEN_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildTokensDocPrompt(
	data: DesignTokens,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	const langInstruction =
		lang === "ko"
			? "Write all prose and descriptions in Korean. Use English for token names and values."
			: "Write all content in English."

	return `Generate a design tokens reference document based on the following analysis.

${langInstruction}

## Design Essence
- Summary: ${essence.summary}
- Design Philosophy: ${essence.designPhilosophy}
- Color Strategy: ${essence.colorStrategy}

## Analyzed Design Tokens
${JSON.stringify(data, null, 2)}

## Output Structure
1. **Color Palette** — Categorize colors by role (surface, text, border, accent, semantic). Include hex values and usage context.
2. **Spacing Scale** — Present the spacing system as a reference table (name, value, usage).
3. **Border Radius** — List radius tiers with values.
4. **Shadows** — List elevation levels with values.
5. **Other Tokens** — Breakpoints, z-index, and any other extracted tokens.

Focus on actionable reference: a developer should be able to implement these tokens without seeing the original codebase.`
}
