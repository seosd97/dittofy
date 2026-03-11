import type { DesignEssence, DesignTokens } from "@defs/analysis.js"
import type { SystemPromptConfig } from "@llm/prompts/system.js"

export const TOKEN_ANALYZER_CONFIG: SystemPromptConfig = {
	role: "You are a design token analyst specializing in extracting design system tokens from frontend codebases.",
	task: "Analyze the provided source code to extract all design tokens: colors, spacing, border-radius, shadows, breakpoints, and z-index values. Identify both explicitly defined tokens (CSS variables, Tailwind config) and implicitly used patterns (hardcoded values that form a consistent system).",
	additionalPrinciples: [
		"Prioritize tokens from configuration files (tailwind.config, CSS :root) over hardcoded values.",
		"Group similar hardcoded values into inferred tokens when they appear 3+ times.",
	],
}

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
