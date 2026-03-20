import { defineAspect } from "@aspects/define-aspect.js"
import { TOKEN_ANALYZER_CONFIG } from "@llm/prompts.js"
import { getStepContract } from "@pipeline/assembly/step-contracts.js"
import { renderTokensDoc } from "./doc-template.js"
import { renderDesignTokensPrompt } from "./prompt-template.js"
import { designTokensSchema } from "./schema.js"

export const tokensAspect = defineAspect({
	name: "designTokens",
	displayName: "Design Tokens",

	analyzer: {
		preset: "tokenAnalyzer",
		schema: designTokensSchema,
		schemaName: "DesignTokens",
		schemaDescription: "Design tokens extracted from the codebase",

		promptConfig: {
			...TOKEN_ANALYZER_CONFIG,
			additionalPrinciples: [
				...(TOKEN_ANALYZER_CONFIG.additionalPrinciples ?? []),
				"Detect dark mode or theme variants if present (CSS dark mode, data-theme attributes, .dark class).",
				"Report theme color overrides with their derivation strategy (inverted, shifted, preserved, custom).",
			],
		},
	},

	planning: {
		docs: [
			{
				filename: "01-design-tokens.md",
				title: "Design Tokens",
				category: "core",
				renderDoc: renderTokensDoc,
			},
		],
		planSteps: () => [
			{
				stepType: "design-tokens",
				title: "Design Tokens",
				scope:
					"Implement design tokens: color palette, spacing scale, border radius, shadows, z-index, and global base styles",
				dependsOn: [{ kind: "type", stepType: "setup" }],
				contract: getStepContract("design-tokens"),
				renderPrompt: renderDesignTokensPrompt,
			},
		],
	},
})
