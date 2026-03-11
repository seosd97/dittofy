import type { DesignEssence, PageStructures } from "@defs/analysis.js"

export { PAGE_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

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
