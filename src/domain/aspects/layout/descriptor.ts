import type { AnalysisResult } from "@defs/analysis.js"
import type { StepDeclaration } from "@defs/descriptor.js"
import { LAYOUT_ANALYZER_CONFIG } from "@domain/llm-prompts/index.js"
import { getStepContract } from "@domain/rendering/step-contracts.js"
import { defineAspect } from "../define-aspect.js"
import { renderLayoutDoc } from "./doc-template.js"
import { renderLayoutShellPrompt } from "./prompt-template.js"
import { layoutSystemSchema } from "./schema.js"

export const layoutAspect = defineAspect({
	name: "layoutSystem",
	displayName: "Layout System",

	analyzer: {
		preset: "layoutAnalyzer",
		schema: layoutSystemSchema,
		schemaName: "LayoutSystem",
		schemaDescription: "Layout system analysis",

		promptConfig: LAYOUT_ANALYZER_CONFIG,
	},

	planning: {
		docs: [
			{
				filename: "04-layout-system.md",
				title: "Layout System",
				category: "core",
				renderDoc: renderLayoutDoc,
			},
		],
		planSteps: (analysis: AnalysisResult): StepDeclaration[] => {
			const ls = analysis.layoutSystem
			if (!ls || (ls.containers.length === 0 && ls.grids.length === 0)) return []
			return [
				{
					stepType: "layout-shell",
					title: "Layout Shell",
					scope:
						"Implement page layout shell: container strategy, grid system, navigation structure, header/footer skeleton, and page wrapper",
					dependsOn: [
						{ kind: "type", stepType: "design-tokens" },
						{ kind: "type", stepType: "typography" },
					],
					contract: getStepContract("layout-shell"),
					renderPrompt: renderLayoutShellPrompt,
				},
			]
		},
	},
})
