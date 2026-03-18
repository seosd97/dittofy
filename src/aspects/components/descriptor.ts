import { defineAspect } from "@aspects/define-aspect.js"
import { COMPONENT_ANALYZER_CONFIG } from "./prompts.js"
import { componentCatalogSchema } from "./schema.js"

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

	planning: {
		docs: [{ filename: "03-component-catalog.md", title: "Component Catalog", category: "core" }],
		planSteps: () => [],
	},
})
