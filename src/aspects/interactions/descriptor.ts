import { defineAspect } from "@aspects/define-aspect.js"
import type { AnalysisResult } from "@defs/analysis.js"
import type { StepDeclaration } from "@defs/descriptor.js"
import { INTERACTION_ANALYZER_CONFIG } from "@llm/prompts.js"
import { getStepContract } from "@pipeline/assembly/step-contracts.js"
import { renderInteractionsDoc } from "./doc-template.js"
import { renderInteractionsPrompt } from "./prompt-template.js"
import { interactionPatternsSchema } from "./schema.js"

export const interactionsAspect = defineAspect({
	name: "interactionPatterns",
	displayName: "Interaction Patterns",

	analyzer: {
		preset: "interactionAnalyzer",
		schema: interactionPatternsSchema,
		schemaName: "InteractionPatterns",
		schemaDescription: "Interaction patterns analysis",

		promptConfig: INTERACTION_ANALYZER_CONFIG,
	},

	planning: {
		docs: [
			{
				filename: "07-interactions.md",
				title: "Interactions",
				category: "dynamic",
				renderDoc: renderInteractionsDoc,
			},
		],
		planSteps: (analysis: AnalysisResult): StepDeclaration[] => {
			const ip = analysis.interactionPatterns
			if (
				!ip ||
				(ip.animations.length === 0 && ip.transitions.length === 0 && ip.gestures.length === 0)
			)
				return []
			return [
				{
					stepType: "interactions",
					title: "Interactions & Animations",
					scope: "Implement animations, transitions, hover effects, and gesture interactions",
					dependsOn: [
						{ kind: "type", stepType: "design-tokens" },
						{ kind: "type", stepType: "showcase-pages" },
					],
					contract: getStepContract("interactions"),
					renderPrompt: renderInteractionsPrompt,
				},
			]
		},
	},
})
