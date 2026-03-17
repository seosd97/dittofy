import { defineAspect } from "@aspects/define-aspect.js"
import { TOKEN_ANALYZER_CONFIG } from "./prompts.js"
import { designTokensSchema } from "./schema.js"

export const tokensAspect = defineAspect({
	name: "designTokens",
	displayName: "Design Tokens",

	analyzer: {
		preset: "tokenAnalyzer",
		schema: designTokensSchema,
		schemaName: "DesignTokens",
		schemaDescription: "Design tokens extracted from the codebase",
		contextConfig: {
			filePriorities: ["config", "style", "component", "layout"],
			mustIncludePatterns: [/tailwind\.config/, /theme/, /variables/, /tokens/],
		},
		promptConfig: TOKEN_ANALYZER_CONFIG,
	},

	planning: {
		docs: [{ filename: "01-design-tokens.md", title: "Design Tokens", category: "core" }],
		planSteps: () => [],
	},
})
