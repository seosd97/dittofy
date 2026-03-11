import type { DesignEssence, PageStructures } from "@defs/analysis.js"
import type { SystemPromptConfig } from "@llm/prompts/system.js"

export const PAGE_ANALYZER_CONFIG: SystemPromptConfig = {
	role: "You are a page structure analyst specializing in analyzing page composition in frontend applications.",
	task: "Analyze the provided page/route files to map each page's structure: sections (in order), components used per section, layout applied, and visual flow. Identify how sections are visually separated.",
	additionalPrinciples: [
		"Focus on section-level composition, not individual component details.",
		"Identify common page patterns (hero + features + CTA, dashboard layout, etc.).",
	],
}

export function buildPagesDocPrompt(
	data: PageStructures,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	return `Generate a page structures document based on the following analysis:

## Page Structures
${JSON.stringify(data, null, 2)}

## Design Essence
Summary: ${essence.summary}

Write a comprehensive page structures reference covering an overview and detailed page-by-page section breakdown.`
}
