import { defineAspect } from "@aspects/define-aspect.js"
import type { LayoutSystem } from "@defs/analysis.js"
import { assembleMarkdown } from "@output/markdown.js"
import { LAYOUT_ANALYZER_CONFIG, buildLayoutDocPrompt } from "./prompts.js"
import { layoutDocSchema, layoutSystemSchema } from "./schema.js"

export const layoutAspect = defineAspect({
	name: "layoutSystem",
	displayName: "Layout System",

	analyzer: {
		preset: "layoutAnalyzer",
		schema: layoutSystemSchema,
		schemaName: "LayoutSystem",
		schemaDescription: "Layout system analysis",
		contextConfig: {
			filePriorities: ["layout", "component", "page", "style", "config"],
			mustIncludePatterns: [/layout/],
		},
		promptConfig: LAYOUT_ANALYZER_CONFIG,
	},

	docGenerator: {
		filename: "04-layout-system.md",
		title: "Layout System",
		category: "core",
		schema: layoutDocSchema,
		schemaName: "layoutDoc",
		schemaDescription: "Layout system document",
		canGenerate: (data: LayoutSystem) => data.containers.length > 0 || data.grids.length > 0,
		buildPrompt: buildLayoutDocPrompt,
		assembleDoc: (title, data) => {
			const d = data as {
				gridSystem: string
				containers: string
				navigation: string
				hierarchy: string
			}
			return assembleMarkdown(title, [
				{ title: "Grid System", content: d.gridSystem },
				{ title: "Containers", content: d.containers },
				{ title: "Navigation", content: d.navigation },
				{ title: "Visual Hierarchy", content: d.hierarchy },
			])
		},
	},

	planning: {
		docs: [{ filename: "04-layout-system.md", title: "Layout System", category: "core" }],
		planSteps: () => [],
	},
})
