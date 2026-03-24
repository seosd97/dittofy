import { TYPOGRAPHY_ANALYZER_CONFIG } from "@domain/llm-prompts/index.js"
import { getStepContract } from "@domain/rendering/step-contracts.js"
import { defineAspect } from "../define-aspect.js"
import { renderTypographyDoc } from "./doc-template.js"
import { renderTypographyPrompt } from "./prompt-template.js"
import { typographySystemSchema } from "./schema.js"

export const typographyAspect = defineAspect({
	name: "typography",
	displayName: "Typography",

	analyzer: {
		preset: "typographyAnalyzer",
		schema: typographySystemSchema,
		schemaName: "TypographySystem",
		schemaDescription: "Typography system analysis",

		promptConfig: TYPOGRAPHY_ANALYZER_CONFIG,
	},

	planning: {
		docs: [
			{
				filename: "02-typography.md",
				title: "Typography",
				category: "core",
				renderDoc: renderTypographyDoc,
			},
		],
		planSteps: () => [
			{
				stepType: "typography",
				title: "Typography",
				scope:
					"Implement typography system: font families, type scale (headings, body, caption), font weights, line heights, and typographic rhythm",
				dependsOn: [{ kind: "type", stepType: "design-tokens" }],
				contract: getStepContract("typography"),
				renderPrompt: renderTypographyPrompt,
			},
		],
	},
})
