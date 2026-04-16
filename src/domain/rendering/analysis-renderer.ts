import type { AnalysisResult, DesignEssence, TechStack } from "@defs/analysis.js"
import type { AspectTypeMap } from "@defs/aspect-map.js"
import {
	renderComponents,
	renderDesignTokens,
	renderInteractions,
	renderLayout,
	renderPages,
	renderResponsive,
	renderTypography,
} from "@domain/rendering/renderers/aspect-renderers.js"

type AspectKey = keyof AspectTypeMap & keyof AnalysisResult

interface AspectSectionConfig {
	title: string
	key: AspectKey
	analyzerName: string
	render: (data: unknown) => string
}

const ASPECT_SECTIONS: AspectSectionConfig[] = [
	{
		title: "Design Tokens",
		key: "designTokens",
		analyzerName: "designTokens",
		render: (data) => renderDesignTokens(data as AspectTypeMap["designTokens"]),
	},
	{
		title: "Typography",
		key: "typography",
		analyzerName: "typography",
		render: (data) => renderTypography(data as AspectTypeMap["typography"]),
	},
	{
		title: "Component Catalog",
		key: "componentCatalog",
		analyzerName: "componentCatalog",
		render: (data) => renderComponents(data as AspectTypeMap["componentCatalog"]),
	},
	{
		title: "Layout System",
		key: "layoutSystem",
		analyzerName: "layoutSystem",
		render: (data) => renderLayout(data as AspectTypeMap["layoutSystem"]),
	},
	{
		title: "Page Structures",
		key: "pageStructures",
		analyzerName: "pageStructures",
		render: (data) => renderPages(data as AspectTypeMap["pageStructures"]),
	},
	{
		title: "Responsive Strategy",
		key: "responsiveStrategy",
		analyzerName: "responsiveStrategy",
		render: (data) => renderResponsive(data as AspectTypeMap["responsiveStrategy"]),
	},
	{
		title: "Interactions",
		key: "interactionPatterns",
		analyzerName: "interactionPatterns",
		render: (data) => renderInteractions(data as AspectTypeMap["interactionPatterns"]),
	},
]

export function renderAnalysisMarkdown(analysis: AnalysisResult): string {
	const lines: string[] = []

	lines.push("# Design System Analysis\n")
	lines.push(renderTechStack(analysis.techStack))
	lines.push(renderEssence(analysis.essence))

	for (const section of ASPECT_SECTIONS) {
		lines.push("---\n")
		const data = analysis[section.key]
		lines.push(renderAspectSection(section, data, analysis.failedAnalyzers))
	}

	lines.push("---\n")
	lines.push(renderMeta(analysis))

	return lines.filter(Boolean).join("\n")
}

function renderAspectSection(
	config: AspectSectionConfig,
	data: unknown,
	failedAnalyzers: string[],
): string {
	const lines: string[] = []
	lines.push(`## ${config.title}\n`)

	if (data == null) {
		if (failedAnalyzers.includes(config.analyzerName)) {
			lines.push(`*Analysis failed — ${config.analyzerName} was not extracted*\n`)
		} else {
			lines.push("*Not included in analysis*\n")
		}
		return lines.join("\n")
	}

	lines.push(config.render(data))
	return lines.join("\n")
}

function renderTechStack(ts: TechStack): string {
	const lines: string[] = ["## Tech Stack\n"]
	lines.push(`- Framework: ${ts.framework.value}`)
	lines.push(`- Language: ${ts.language.value}`)
	const styling =
		typeof ts.styling.value === "string" ? ts.styling.value : ts.styling.value.approach
	lines.push(`- Styling: ${styling}`)
	if (ts.uiLibrary) lines.push(`- UI Library: ${ts.uiLibrary.value}`)
	if (ts.stateManagement) lines.push(`- State Management: ${ts.stateManagement.value}`)
	if (ts.buildTool) lines.push(`- Build Tool: ${ts.buildTool.value}`)
	lines.push("")
	return lines.join("\n")
}

function renderEssence(e: DesignEssence): string {
	const lines: string[] = ["## Design Essence\n"]
	lines.push(`> ${e.summary}\n`)
	lines.push(`**Philosophy**: ${e.designPhilosophy}`)
	lines.push(`**App Type**: ${e.appType}`)
	lines.push("**Key Characteristics**:")
	for (const c of e.keyCharacteristics) {
		lines.push(`- ${c}`)
	}
	lines.push("")
	lines.push("### Strategies")
	lines.push(`- **Color**: ${e.colorStrategy}`)
	lines.push(`- **Typography**: ${e.typographyStrategy}`)
	lines.push(`- **Layout**: ${e.layoutStrategy}`)
	lines.push(`- **Component**: ${e.componentStrategy}`)
	lines.push(`- **Interaction**: ${e.interactionStrategy}`)
	lines.push("")
	return lines.join("\n")
}

function renderMeta(analysis: AnalysisResult): string {
	const lines: string[] = ["## Analysis Meta\n"]
	const meta = analysis.meta

	if (meta) {
		lines.push(`- Analyzed: ${meta.analyzedAt}`)
		lines.push(`- Source: ${meta.source}`)
		if (meta.tier) lines.push(`- Tier: ${meta.tier}`)
		lines.push(`- Duration: ${Math.round(meta.duration / 1000)}s`)
	}

	if (analysis.failedAnalyzers.length > 0) {
		lines.push(`- Failed: ${analysis.failedAnalyzers.join(", ")}`)
	}

	lines.push("")
	return lines.join("\n")
}
