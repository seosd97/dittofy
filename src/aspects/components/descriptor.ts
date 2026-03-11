import { defineAspect } from "@aspects/define-aspect.js"
import type { AnalysisResult, ComponentCatalog } from "@defs/analysis.js"
import type { StepDeclaration } from "@defs/descriptor.js"
import { assembleMarkdown } from "@output/markdown.js"
import { COMPONENT_ANALYZER_CONFIG, buildComponentsDocPrompt } from "./prompts.js"
import { componentCatalogSchema, componentsDocSchema } from "./schema.js"

const COMPONENTS_PER_STEP = 5

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
		planSteps: (analysis: AnalysisResult): StepDeclaration[] => {
			const components = analysis.componentCatalog?.components ?? []
			if (components.length === 0) return []

			const groupCount = Math.ceil(components.length / COMPONENTS_PER_STEP)
			const steps: StepDeclaration[] = []

			for (let i = 0; i < groupCount; i++) {
				const start = i * COMPONENTS_PER_STEP
				const end = Math.min(start + COMPONENTS_PER_STEP, components.length)
				const names = components.slice(start, end).map((c) => c.name)

				steps.push({
					stepType: "components",
					title: `Components (${i + 1}/${groupCount})`,
					scope: `Implement components: ${names.join(", ")}`,
					dependsOn: [
						{ kind: "type", stepType: "setup" },
						{ kind: "type", stepType: "design-system" },
					],
					meta: { componentNames: names },
				})
			}

			return steps
		},
	},
})
