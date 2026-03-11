import type { DesignEssence, ResponsiveStrategy } from "@defs/analysis.js"
import type { SystemPromptConfig } from "@llm/prompts/system.js"

export const RESPONSIVE_ANALYZER_CONFIG: SystemPromptConfig = {
	role: "You are a responsive design analyst specializing in analyzing adaptive strategies in frontend projects.",
	task: "Analyze the provided code to determine the responsive strategy: mobile-first vs desktop-first approach, breakpoint definitions, responsive patterns for layout/typography/spacing, and component adaptation strategies.",
	additionalPrinciples: [
		"Check Tailwind config screens, CSS media queries, and container queries.",
		"If no responsive patterns are found, report null rather than guessing.",
	],
}

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
