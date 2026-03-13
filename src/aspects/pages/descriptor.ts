import { defineAspect } from "@aspects/define-aspect.js"
import type { AnalysisResult, PageStructures } from "@defs/analysis.js"
import type { StepDeclaration } from "@defs/descriptor.js"
import { assembleMarkdown } from "@output/markdown.js"
import { PAGE_ANALYZER_CONFIG, buildPagesDocPrompt } from "./prompts.js"
import { pageStructuresSchema, pagesDocSchema } from "./schema.js"

export const pagesAspect = defineAspect({
	name: "pageStructures",
	displayName: "Page Structures",

	analyzer: {
		preset: "pageAnalyzer",
		schema: pageStructuresSchema,
		schemaName: "PageStructures",
		schemaDescription: "Page structures analysis",
		contextConfig: {
			filePriorities: ["page", "layout", "component", "route", "config"],
			mustIncludePatterns: [],
		},
		promptConfig: PAGE_ANALYZER_CONFIG,
	},

	docGenerator: {
		filename: "05-page-structures.md",
		title: "Page Structures",
		category: "dynamic",
		schema: pagesDocSchema,
		schemaName: "pagesDoc",
		schemaDescription: "Page structures document",
		canGenerate: (data: PageStructures) => data.pages.length > 0,
		buildPrompt: buildPagesDocPrompt,
		assembleDoc: (title, data) => {
			const d = data as { overview: string; pageDetails: string }
			return assembleMarkdown(title, [
				{ title: "Overview", content: d.overview },
				{ title: "Page Details", content: d.pageDetails },
			])
		},
	},

	planning: {
		docs: [{ filename: "05-page-structures.md", title: "Page Structures", category: "dynamic" }],
		planSteps: (_analysis: AnalysisResult): StepDeclaration[] => {
			return [
				{
					stepType: "showcase-pages",
					title: "Showcase Pages",
					scope: "Implement sample showcase pages (Home, About) that demonstrate the design system in action. These are NOT replicas of the source project pages — they are new pages that showcase the extracted design tokens, typography, components, and layout patterns.",
					dependsOn: [
						{ kind: "type", stepType: "design-tokens" },
						{ kind: "type", stepType: "typography" },
						{ kind: "type", stepType: "layout-shell" },
					],
				},
			]
		},
	},
})
