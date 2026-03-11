import type { DesignEssence, ResponsiveStrategy } from "@defs/analysis.js"

export { RESPONSIVE_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildResponsiveDocPrompt(
	data: ResponsiveStrategy,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	return `Generate a responsive strategy document based on the following analysis:

## Responsive Strategy
${JSON.stringify(data, null, 2)}

## Design Essence
Summary: ${essence.summary}

Write a comprehensive responsive strategy reference covering the approach, breakpoints reference table, and responsive patterns.`
}
