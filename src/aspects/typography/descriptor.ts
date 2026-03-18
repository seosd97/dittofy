import { defineAspect } from "@aspects/define-aspect.js"
import { TYPOGRAPHY_ANALYZER_CONFIG } from "./prompts.js"
import { typographySystemSchema } from "./schema.js"

export const typographyAspect = defineAspect({
	name: "typography",
	displayName: "Typography",

	analyzer: {
		preset: "typographyAnalyzer",
		schema: typographySystemSchema,
		schemaName: "TypographySystem",
		schemaDescription: "Typography system analysis",
		contextConfig: {
			filePriorities: ["config", "style", "component", "page"],
			mustIncludePatterns: [/tailwind\.config/, /font/, /typography/],
		},
		promptConfig: TYPOGRAPHY_ANALYZER_CONFIG,
	},

	planning: {
		docs: [{ filename: "02-typography.md", title: "Typography", category: "core" }],
		planSteps: () => [],
	},
})
