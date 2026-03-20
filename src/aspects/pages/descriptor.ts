import { defineAspect } from "@aspects/define-aspect.js"
import type { AnalysisResult } from "@defs/analysis.js"
import type { StepDeclaration } from "@defs/descriptor.js"
import { PAGE_ANALYZER_CONFIG } from "@llm/prompts.js"
import { getStepContract } from "@pipeline/assembly/step-contracts.js"
import { renderPagesDoc } from "./doc-template.js"
import { renderShowcasePagesPrompt } from "./prompt-template.js"
import { pageStructuresSchema } from "./schema.js"

export const pagesAspect = defineAspect({
	name: "pageStructures",
	displayName: "Page Structures",

	analyzer: {
		preset: "pageAnalyzer",
		schema: pageStructuresSchema,
		schemaName: "PageStructures",
		schemaDescription: "Page structures analysis",

		promptConfig: PAGE_ANALYZER_CONFIG,
	},

	planning: {
		docs: [
			{
				filename: "05-page-structures.md",
				title: "Page Structures",
				category: "dynamic",
				renderDoc: renderPagesDoc,
			},
		],
		planSteps: (_analysis: AnalysisResult): StepDeclaration[] => {
			return [
				{
					stepType: "showcase-pages",
					title: "Showcase Pages",
					scope:
						"Implement sample showcase pages (Home, About) that demonstrate the design system in action. These are NOT replicas of the source project pages — they are new pages that showcase the extracted design tokens, typography, components, and layout patterns.",
					dependsOn: [
						{ kind: "type", stepType: "design-tokens" },
						{ kind: "type", stepType: "typography" },
						{ kind: "type", stepType: "layout-shell" },
					],
					contract: getStepContract("showcase-pages"),
					renderPrompt: renderShowcasePagesPrompt,
				},
			]
		},
	},
})
