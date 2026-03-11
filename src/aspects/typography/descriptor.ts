import { defineAspect } from "@aspects/define-aspect.js"
import type { TypographySystem } from "@defs/analysis.js"
import { assembleMarkdown } from "@output/markdown.js"
import { TYPOGRAPHY_ANALYZER_CONFIG, buildTypographyDocPrompt } from "./prompts.js"
import { typographyDocSchema, typographySystemSchema } from "./schema.js"

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

	docGenerator: {
		filename: "02-typography.md",
		title: "Typography",
		category: "core",
		schema: typographyDocSchema,
		schemaName: "typographyDoc",
		schemaDescription: "Typography document",
		canGenerate: (data: TypographySystem) => data.scale.length > 0,
		buildPrompt: buildTypographyDocPrompt,
		assembleDoc: (title, data) => {
			const d = data as { fontFamilies: string; typeScale: string; principles: string }
			return assembleMarkdown(title, [
				{ title: "Font Families", content: d.fontFamilies },
				{ title: "Type Scale", content: d.typeScale },
				{ title: "Typography Principles", content: d.principles },
			])
		},
	},

	planning: {
		docs: [{ filename: "02-typography.md", title: "Typography", category: "core" }],
		planSteps: () => [],
	},
})
