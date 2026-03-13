import { defineAspect } from "@aspects/define-aspect.js"
import type { ComponentCatalog } from "@defs/analysis.js"
import { assembleMarkdown } from "@output/markdown.js"
import { COMPONENT_ANALYZER_CONFIG, buildComponentsDocPrompt } from "./prompts.js"
import { componentCatalogSchema, componentsDocSchema } from "./schema.js"

export const componentsAspect = defineAspect({
	name: "componentCatalog",
	displayName: "Component Catalog",

	analyzer: {
		preset: "componentAnalyzer",
		schema: componentCatalogSchema,
		schemaName: "ComponentCatalog",
		schemaDescription: "Component catalog analysis",
		contextConfig: {
			filePriorities: ["component", "style", "hook", "type", "config"],
			mustIncludePatterns: [],
		},
		promptConfig: COMPONENT_ANALYZER_CONFIG,
	},

	docGenerator: {
		filename: "03-component-catalog.md",
		title: "Component Catalog",
		category: "core",
		schema: componentsDocSchema,
		schemaName: "componentsDoc",
		schemaDescription: "Component catalog document",
		canGenerate: (data: ComponentCatalog) => data.components.length > 0,
		buildPrompt: buildComponentsDocPrompt,
		assembleDoc: (title, data) => {
			const d = data as { overview: string; componentList: string; patterns: string }
			return assembleMarkdown(title, [
				{ title: "Overview", content: d.overview },
				{ title: "Components", content: d.componentList },
				{ title: "Composition Patterns", content: d.patterns },
			])
		},
	},

	planning: {
		docs: [{ filename: "03-component-catalog.md", title: "Component Catalog", category: "core" }],
		planSteps: () => [],
	},
})
