import { defineAspect } from "@aspects/define-aspect.js"
import { COMPONENT_ANALYZER_CONFIG } from "@llm/prompts.js"
import {
	buildComponentChunkPrompt,
	componentChunkSchema,
	extractComponentChunks,
	mergeComponentChunks,
} from "./chunking.js"
import { renderComponentsDoc } from "./doc-template.js"
import { componentCatalogSchema } from "./schema.js"

export const componentsAspect = defineAspect({
	name: "componentCatalog",
	displayName: "Component Catalog",

	analyzer: {
		preset: "componentAnalyzer",
		schema: componentCatalogSchema,
		schemaName: "ComponentCatalog",
		schemaDescription: "Component catalog analysis",

		promptConfig: COMPONENT_ANALYZER_CONFIG,
		chunkedAnalysis: {
			chunkPreset: "componentChunkAnalyzer",
			chunkSchema: componentChunkSchema,
			chunkSchemaName: "ComponentCatalogChunk",
			batchSize: 5,
			extractChunks: extractComponentChunks,
			buildChunkPrompt: buildComponentChunkPrompt,
			merge: mergeComponentChunks,
		},
	},

	planning: {
		docs: [
			{
				filename: "03-component-catalog.md",
				title: "Component Catalog",
				category: "core",
				renderDoc: renderComponentsDoc,
			},
		],
		planSteps: () => [],
	},
})
