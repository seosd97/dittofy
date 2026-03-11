import type { DesignEssence, TypographySystem } from "@defs/analysis.js"

export { TYPOGRAPHY_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildTypographyDocPrompt(
	data: TypographySystem,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	return `Generate a typography document based on the following analysis:

## Typography System
${JSON.stringify(data, null, 2)}

## Design Essence
Typography Strategy: ${essence.typographyStrategy}

Write a comprehensive typography reference covering font families, type scale, and typography principles.`
}
