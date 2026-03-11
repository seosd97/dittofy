import { defineAspect } from "@aspects/define-aspect.js"
import type { AnalysisResult, InteractionPatterns } from "@defs/analysis.js"
import type { StepDeclaration } from "@defs/descriptor.js"
import { assembleMarkdown } from "@output/markdown.js"
import { INTERACTION_ANALYZER_CONFIG, buildInteractionsDocPrompt } from "./prompts.js"
import { interactionPatternsSchema, interactionsDocSchema } from "./schema.js"

export const interactionsAspect = defineAspect({
	name: "interactionPatterns",
	displayName: "Interaction Patterns",

	analyzer: {
		preset: "interactionAnalyzer",
		schema: interactionPatternsSchema,
		schemaName: "InteractionPatterns",
		schemaDescription: "Interaction patterns analysis",
		contextConfig: {
			filePriorities: ["component", "hook", "style", "page", "config"],
			mustIncludePatterns: [/motion/, /animation/, /framer/],
		},
		promptConfig: INTERACTION_ANALYZER_CONFIG,
	},

	docGenerator: {
		filename: "07-interactions.md",
		title: "Interactions",
		category: "dynamic",
		schema: interactionsDocSchema,
		schemaName: "interactionsDoc",
		schemaDescription: "Interactions document",
		canGenerate: (data: InteractionPatterns) =>
			data.animations.length > 0 || data.transitions.length > 0 || data.gestures.length > 0,
		buildPrompt: buildInteractionsDocPrompt,
		assembleDoc: (title, data) => {
			const d = data as {
				motionStyle: string
				animations: string
				transitions: string
				principles: string
			}
			return assembleMarkdown(title, [
				{ title: "Motion Style", content: d.motionStyle },
				{ title: "Animations", content: d.animations },
				{ title: "Transitions", content: d.transitions },
				{ title: "Interaction Principles", content: d.principles },
			])
		},
	},

	planning: {
		docs: [{ filename: "07-interactions.md", title: "Interactions", category: "dynamic" }],
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
						{ kind: "type", stepType: "setup" },
						{ kind: "type", stepType: "design-system" },
						{ kind: "type", stepType: "pages" },
					],
				},
			]
		},
	},
})
