import { defineAspect } from "@aspects/define-aspect.js"
import type { AnalysisResult } from "@defs/analysis.js"
import type { StepDeclaration } from "@defs/descriptor.js"
import { RESPONSIVE_ANALYZER_CONFIG } from "@llm/prompts.js"
import { getStepContract } from "@pipeline/assembly/step-contracts.js"
import { renderResponsiveDoc } from "./doc-template.js"
import { renderResponsivePrompt } from "./prompt-template.js"
import { responsiveStrategySchema } from "./schema.js"

export const responsiveAspect = defineAspect({
	name: "responsiveStrategy",
	displayName: "Responsive Strategy",

	analyzer: {
		preset: "responsiveAnalyzer",
		schema: responsiveStrategySchema,
		schemaName: "ResponsiveStrategy",
		schemaDescription: "Responsive strategy analysis",

		promptConfig: RESPONSIVE_ANALYZER_CONFIG,
	},

	planning: {
		docs: [
			{
				filename: "06-responsive-strategy.md",
				title: "Responsive Strategy",
				category: "dynamic",
				renderDoc: renderResponsiveDoc,
			},
		],
		planSteps: (analysis: AnalysisResult): StepDeclaration[] => {
			const rs = analysis.responsiveStrategy
			if (!rs?.approach || rs.patterns.length === 0) return []
			return [
				{
					stepType: "responsive",
					title: "Responsive Design",
					scope: "Implement responsive breakpoints, media queries, and adaptive layouts",
					dependsOn: [
						{ kind: "type", stepType: "design-tokens" },
						{ kind: "type", stepType: "showcase-pages" },
					],
					contract: getStepContract("responsive"),
					renderPrompt: renderResponsivePrompt,
				},
			]
		},
	},
})
