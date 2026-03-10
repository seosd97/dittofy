import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { DOC_GENERATOR_CONFIG } from "../../../llm/prompts/generators.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { pagesDocSchema } from "../../../llm/schemas/documentation.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { DesignEssence, PageStructures } from "../../../types/analysis.js"
import type { DocumentEntry } from "../../../types/documentation.js"
import { assembleMarkdown } from "./assemble-markdown.js"

export async function generatePagesDoc(
	pages: PageStructures,
	essence: DesignEssence,
	model: LanguageModel,
	usage: UsageTracker,
	language: "ko" | "en",
): Promise<DocumentEntry> {
	const system = buildSystemPrompt({ ...DOC_GENERATOR_CONFIG, outputLanguage: language })

	const prompt = `Generate a page structures document based on the following analysis:

## Page Structures
${JSON.stringify(pages, null, 2)}

## Design Essence
Summary: ${essence.summary}

Write a comprehensive page structures reference covering an overview and detailed page-by-page section breakdown.`

	const result = await callLLM({
		model,
		preset: "docGenerator",
		system,
		prompt,
		schema: pagesDocSchema,
		schemaName: "pagesDoc",
		schemaDescription: "Page structures document",
	})

	usage.record("documentation", "pages-gen", result.usage)

	const content = assembleMarkdown("Page Structures", [
		{ title: "Overview", content: result.data.overview },
		{ title: "Page Details", content: result.data.pageDetails },
	])

	return {
		filename: "05-page-structures.md",
		title: "Page Structures",
		content,
		category: "dynamic",
	}
}
