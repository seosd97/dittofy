import type { AnalysisResult } from "../../types/analysis.js"
import type { DocumentSet } from "../../types/documentation.js"
import type { StepPlanEntry } from "../../types/prompts.js"

export function injectContext(
	step: StepPlanEntry,
	analysis: AnalysisResult,
	documents: DocumentSet,
): string {
	switch (step.stepType) {
		case "setup":
			return buildSetupContext(analysis)
		case "design-system":
			return buildDesignSystemContext(analysis, documents)
		case "components":
			return buildComponentContext(step, analysis)
		case "pages":
			return buildPageContext(analysis)
		case "responsive":
			return buildResponsiveContext(analysis)
		case "interactions":
			return buildInteractionContext(analysis)
		default:
			return buildGenericContext(analysis, documents)
	}
}

function buildSetupContext(analysis: AnalysisResult): string {
	const { techStack, essence } = analysis
	const lines: string[] = []

	lines.push("## Tech Stack")
	lines.push(`- Framework: ${techStack.framework.value} (${techStack.framework.confidence})`)
	lines.push(`- Language: ${techStack.language.value} (${techStack.language.confidence})`)
	lines.push(
		`- Styling: ${techStack.styling.value.approach} (tier ${techStack.styling.value.tier})`,
	)
	if (techStack.uiLibrary) {
		lines.push(`- UI Library: ${techStack.uiLibrary.value}`)
	}
	if (techStack.stateManagement) {
		lines.push(`- State Management: ${techStack.stateManagement.value}`)
	}
	if (techStack.buildTool) {
		lines.push(`- Build Tool: ${techStack.buildTool.value}`)
	}

	lines.push("")
	lines.push("## Design Essence")
	lines.push(essence.summary)
	lines.push("")
	lines.push(`Design Philosophy: ${essence.designPhilosophy}`)
	lines.push("")
	lines.push("Key Characteristics:")
	for (const char of essence.keyCharacteristics) {
		lines.push(`- ${char}`)
	}

	return lines.join("\n")
}

function buildDesignSystemContext(analysis: AnalysisResult, documents: DocumentSet): string {
	const { designTokens, typography } = analysis
	const lines: string[] = []

	lines.push("## Color Tokens")
	for (const color of designTokens?.colors ?? []) {
		lines.push(`- ${color.name}: ${color.value} (${color.usage})`)
	}

	lines.push("")
	lines.push("## Spacing Tokens")
	for (const spacing of designTokens?.spacing ?? []) {
		lines.push(`- ${spacing.name}: ${spacing.value} (${spacing.usage})`)
	}

	lines.push("")
	lines.push("## Border Radius")
	for (const radius of designTokens?.borderRadius ?? []) {
		lines.push(`- ${radius.name}: ${radius.value}`)
	}

	lines.push("")
	lines.push("## Shadows")
	for (const shadow of designTokens?.shadows ?? []) {
		lines.push(`- ${shadow.name}: ${shadow.value}`)
	}

	lines.push("")
	lines.push("## Typography")
	lines.push(`Font Families: ${typography?.fontFamilies.value.join(", ") ?? "N/A"}`)
	lines.push("")
	lines.push("### Scale")
	for (const scale of typography?.scale ?? []) {
		lines.push(
			`- ${scale.name}: ${scale.fontSize}${scale.lineHeight ? ` / ${scale.lineHeight}` : ""}${scale.fontWeight ? ` @ ${scale.fontWeight}` : ""} (${scale.usage})`,
		)
	}

	lines.push("")
	lines.push("### Font Weights")
	for (const weight of typography?.fontWeights ?? []) {
		lines.push(`- ${weight.name}: ${weight.value}`)
	}

	lines.push("")
	lines.push("### Line Heights")
	for (const lh of typography?.lineHeights ?? []) {
		lines.push(`- ${lh.name}: ${lh.value}`)
	}

	// Include relevant document content (design tokens or design system docs only)
	const designDocs = documents.documents.filter(
		(d) =>
			d.filename === "01-design-tokens.md" ||
			d.filename === "02-typography.md",
	)
	if (designDocs.length > 0) {
		lines.push("")
		lines.push("## Reference Documents")
		for (const doc of designDocs) {
			lines.push(`### ${doc.title}`)
			lines.push(doc.content)
		}
	}

	return lines.join("\n")
}

function buildComponentContext(step: StepPlanEntry, analysis: AnalysisResult): string {
	const { componentCatalog, designTokens, techStack } = analysis
	const lines: string[] = []

	// Include tech stack context so LLM knows the styling approach
	lines.push("## Tech Stack")
	lines.push(`- Framework: ${techStack.framework.value}`)
	lines.push(`- Styling: ${techStack.styling.value.approach}`)
	if (techStack.uiLibrary) {
		lines.push(`- UI Library: ${techStack.uiLibrary.value}`)
	}
	lines.push("")

	// Use structured componentNames from step plan
	const targetNames = step.componentNames ?? []
	const relevantComponents = (componentCatalog?.components ?? []).filter((c) =>
		targetNames.includes(c.name),
	)

	if (relevantComponents.length === 0) {
		return lines.join("\n") + "\n## Component Specifications\nNo matching components found for this step."
	}

	lines.push("## Component Specifications")
	for (const comp of relevantComponents) {
		lines.push(`### ${comp.name}`)
		lines.push(`- Category: ${comp.category}`)
		lines.push(`- Description: ${comp.description}`)
		lines.push(`- File: ${comp.filePath}`)
		if (comp.variants.length > 0) {
			lines.push(`- Variants: ${comp.variants.join(", ")}`)
		}
		if (comp.props.length > 0) {
			lines.push("- Props:")
			for (const prop of comp.props) {
				lines.push(
					`  - ${prop.name}: ${prop.type}${prop.required ? " (required)" : ""}${prop.defaultValue ? ` = ${prop.defaultValue}` : ""}`,
				)
			}
		}
		lines.push("")
	}

	// Include relevant tokens
	lines.push("## Design Tokens (Reference)")
	lines.push("### Colors")
	for (const color of designTokens?.colors ?? []) {
		lines.push(`- ${color.name}: ${color.value}`)
	}
	lines.push("")
	lines.push("### Spacing")
	for (const spacing of designTokens?.spacing ?? []) {
		lines.push(`- ${spacing.name}: ${spacing.value}`)
	}

	return lines.join("\n")
}

function buildPageContext(analysis: AnalysisResult): string {
	const { pageStructures, layoutSystem, componentCatalog, techStack } = analysis
	const lines: string[] = []

	lines.push("## Tech Stack")
	lines.push(`- Framework: ${techStack.framework.value}`)
	lines.push(`- Styling: ${techStack.styling.value.approach}`)
	lines.push("")

	lines.push("## Page Structures")
	for (const page of pageStructures?.pages ?? []) {
		lines.push(`### ${page.name}`)
		lines.push(`- Route: ${page.route}`)
		lines.push(`- Layout: ${page.layout}`)
		lines.push(`- Sections: ${page.sections.join(", ")}`)
		lines.push(`- Components: ${page.components.join(", ")}`)
		lines.push("")
	}

	lines.push("## Layout System")
	lines.push(`Approach: ${layoutSystem?.approach.value ?? "N/A"}`)
	lines.push("")
	if ((layoutSystem?.containers.length ?? 0) > 0) {
		lines.push("### Containers")
		for (const container of layoutSystem?.containers ?? []) {
			lines.push(
				`- ${container.name}: max-width ${container.maxWidth ?? "auto"}, padding ${container.padding ?? "0"}`,
			)
		}
		lines.push("")
	}
	if ((layoutSystem?.grids.length ?? 0) > 0) {
		lines.push("### Grids")
		for (const grid of layoutSystem?.grids ?? []) {
			lines.push(
				`- ${grid.type}: ${grid.columns ? `${grid.columns} columns` : ""}${grid.gap ? `, gap ${grid.gap}` : ""}`,
			)
		}
		lines.push("")
	}
	if ((layoutSystem?.navigation.length ?? 0) > 0) {
		lines.push("### Navigation Patterns")
		for (const nav of layoutSystem?.navigation ?? []) {
			lines.push(`- ${nav.type}: ${nav.description}`)
		}
		lines.push("")
	}

	lines.push("## Available Components")
	for (const comp of componentCatalog?.components ?? []) {
		lines.push(`- ${comp.name} (${comp.category})`)
	}

	return lines.join("\n")
}

function buildResponsiveContext(analysis: AnalysisResult): string {
	const { responsiveStrategy, designTokens } = analysis
	const lines: string[] = []

	lines.push("## Responsive Strategy")
	lines.push(`Approach: ${responsiveStrategy?.approach.value ?? "N/A"}`)
	lines.push("")

	lines.push("### Breakpoints")
	for (const bp of responsiveStrategy?.breakpoints ?? []) {
		lines.push(`- ${bp.name}: ${bp.value}`)
	}
	lines.push("")

	lines.push("### Token Breakpoints")
	for (const bp of designTokens?.breakpoints ?? []) {
		lines.push(`- ${bp.name}: ${bp.value}`)
	}
	lines.push("")

	lines.push("### Responsive Patterns")
	for (const pattern of responsiveStrategy?.patterns ?? []) {
		lines.push(`- ${pattern.name}: ${pattern.description} (at ${pattern.breakpoint})`)
	}

	return lines.join("\n")
}

function buildInteractionContext(analysis: AnalysisResult): string {
	const { interactionPatterns } = analysis
	const lines: string[] = []

	lines.push("## Animation Patterns")
	for (const anim of interactionPatterns?.animations ?? []) {
		lines.push(`### ${anim.name}`)
		lines.push(`- Type: ${anim.type}`)
		lines.push(`- Description: ${anim.description}`)
		lines.push("")
	}

	lines.push("## Transitions")
	for (const trans of interactionPatterns?.transitions ?? []) {
		lines.push(`- ${trans.property}: ${trans.duration} ${trans.easing}`)
	}
	lines.push("")

	lines.push("## Gestures")
	for (const gesture of interactionPatterns?.gestures ?? []) {
		lines.push(`- ${gesture.type}: ${gesture.description}`)
	}

	return lines.join("\n")
}

function buildGenericContext(analysis: AnalysisResult, documents: DocumentSet): string {
	const lines: string[] = []

	lines.push("## Design Essence")
	lines.push(analysis.essence.summary)
	lines.push("")

	for (const doc of documents.documents) {
		lines.push(`## ${doc.title}`)
		lines.push(doc.content)
		lines.push("")
	}

	return lines.join("\n")
}
