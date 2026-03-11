import type { DesignEssence, DesignTokens } from "@defs/analysis.js"

export { TOKEN_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildTokensDocPrompt(
	data: DesignTokens,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	return `Generate a design tokens document based on the following analysis:

## Design Tokens
${JSON.stringify(data, null, 2)}

## Design Essence
Color Strategy: ${essence.colorStrategy}

Write a comprehensive design tokens reference covering color palette, spacing scale, border radius, shadows, and other tokens.`
}
