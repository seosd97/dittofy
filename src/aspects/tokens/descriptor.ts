import { defineAspect } from "@aspects/define-aspect.js"
import type { DesignTokens } from "@defs/analysis.js"
import { assembleMarkdown } from "@output/markdown.js"
import { TOKEN_ANALYZER_CONFIG, buildTokensDocPrompt } from "./prompts.js"
import { designTokensSchema, tokensDocSchema } from "./schema.js"

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

	docGenerator: {
		filename: "01-design-tokens.md",
		title: "Design Tokens",
		category: "core",
		schema: tokensDocSchema,
		schemaName: "tokensDoc",
		schemaDescription: "Design tokens document",
		canGenerate: (data: DesignTokens) => data.colors.length > 0 || data.spacing.length > 0,
		buildPrompt: buildTokensDocPrompt,
		assembleDoc: (title, data) => {
			const d = data as {
				colorPalette: string
				spacing: string
				borderRadius: string
				shadows: string
				otherTokens: string
			}
			return assembleMarkdown(title, [
				{ title: "Color Palette", content: d.colorPalette },
				{ title: "Spacing", content: d.spacing },
				{ title: "Border Radius", content: d.borderRadius },
				{ title: "Shadows", content: d.shadows },
				{ title: "Other Tokens", content: d.otherTokens },
			])
		},
	},

	planning: {
		docs: [{ filename: "01-design-tokens.md", title: "Design Tokens", category: "core" }],
		planSteps: () => [],
	},
})
