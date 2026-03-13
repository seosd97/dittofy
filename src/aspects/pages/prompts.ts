import type { DesignEssence, PageStructures } from "@defs/analysis.js"

export { PAGE_ANALYZER_CONFIG } from "@llm/prompts/analyzers.js"

export function buildPagesDocPrompt(
	data: PageStructures,
	essence: DesignEssence,
	lang: "ko" | "en",
): string {
	const langInstruction =
		lang === "ko"
			? "Write all prose and descriptions in Korean. Use English for component names and technical terms."
			: "Write all content in English."

	return `Generate a page structure patterns reference document based on the following analysis.

This documents the **structural patterns** extracted from the source project's pages. The purpose is to inform showcase page design — NOT to replicate the source pages 1:1. Focus on reusable layout patterns, section composition strategies, and visual flow principles.

${langInstruction}

## Design Essence
- Summary: ${essence.summary}
- Layout Strategy: ${essence.layoutStrategy}
- Design Philosophy: ${essence.designPhilosophy}

## Analyzed Page Structures
${JSON.stringify(data, null, 2)}

## Output Structure
1. **Overview** — Summarize the common page composition patterns found across pages (e.g., hero + features + CTA, dashboard grid, sidebar layout). Identify recurring section types.
2. **Pattern Details** — For each recurring pattern: describe the section structure, visual flow, and how components are composed. Group by pattern type, not by individual source page.

Focus on transferable patterns that can be applied to new showcase pages (Home, About), not on documenting each source page individually.`
}
