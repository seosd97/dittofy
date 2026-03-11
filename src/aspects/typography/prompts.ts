import type { DesignEssence, TypographySystem } from "@defs/analysis.js"
import type { SystemPromptConfig } from "@llm/prompts/system.js"

export const TYPOGRAPHY_ANALYZER_CONFIG: SystemPromptConfig = {
	role: "You are a typography analyst specializing in analyzing typographic systems in frontend projects.",
	task: "Analyze the provided source code to extract the complete typography system: font families, type scale (heading/body/caption sizes), line heights, font weights, and letter spacing. Describe the typographic character and hierarchy.",
	additionalPrinciples: [
		"Identify the primary and secondary font families and their usage contexts.",
		"Map the complete type scale from largest heading to smallest caption.",
	],
}

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
