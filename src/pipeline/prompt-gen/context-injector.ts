import type { AnalysisResult } from "@defs/analysis.js"
import type { DocumentSet } from "@defs/documentation.js"
import type { StepPlanEntry } from "@defs/prompts.js"

export function injectContext(
	step: StepPlanEntry,
	analysis: AnalysisResult,
	documents: DocumentSet,
): string {
	switch (step.stepType) {
		case "setup":
			return buildSetupContext(analysis)
		case "design-tokens":
			return buildDesignTokensContext(analysis, documents)
		case "typography":
			return buildTypographyContext(analysis, documents)
		case "layout-shell":
			return buildLayoutShellContext(analysis)
		case "showcase-pages":
			return buildShowcasePageContext(analysis)
		case "responsive":
			return buildResponsiveContext(analysis)
		case "interactions":
			return buildInteractionContext(analysis)
		default:
			return buildGenericContext(analysis, documents)
	}
}

function buildSetupContext(analysis: AnalysisResult): string {
	const { essence } = analysis
	const lines: string[] = []

	lines.push("## Design Essence")
	lines.push(essence.summary)
	lines.push("")
	lines.push(`Design Philosophy: ${essence.designPhilosophy}`)
	lines.push("")
	lines.push("Key Characteristics:")
	for (const char of essence.keyCharacteristics) {
		lines.push(`- ${char}`)
	}

	lines.push("")
	lines.push("## Design Token Categories")
	lines.push("The project's design system should include the following token categories:")
	lines.push(
		"- Colors: surface/background, text hierarchy, borders, accents, semantic (success/error/warning)",
	)
	lines.push("- Spacing: consistent scale (e.g., 4px base unit)")
	lines.push("- Typography: font families, size scale, weight scale, line heights")
	lines.push("- Border Radius: size tiers")
	lines.push("- Shadows: elevation levels")
	lines.push("- Transitions: duration/easing presets")

	return lines.join("\n")
}

function buildDesignTokensContext(analysis: AnalysisResult, documents: DocumentSet): string {
	const { designTokens } = analysis
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
	lines.push("## Z-Index")
	for (const z of designTokens?.zIndex ?? []) {
		lines.push(`- ${z.name}: ${z.value}`)
	}

	lines.push("")
	lines.push("## Breakpoints")
	for (const bp of designTokens?.breakpoints ?? []) {
		lines.push(`- ${bp.name}: ${bp.value}`)
	}

	const tokenDoc = documents.documents.find((d) => d.filename === "01-design-tokens.md")
	if (tokenDoc) {
		lines.push("")
		lines.push("## Reference Document")
		lines.push(`### ${tokenDoc.title}`)
		lines.push(tokenDoc.content)
	}

	return lines.join("\n")
}

function buildTypographyContext(analysis: AnalysisResult, documents: DocumentSet): string {
	const { typography } = analysis
	const lines: string[] = []

	lines.push("## Font Families")
	lines.push(`Families: ${typography?.fontFamilies.value.join(", ") ?? "N/A"}`)
	lines.push("")

	lines.push("## Type Scale")
	for (const scale of typography?.scale ?? []) {
		lines.push(
			`- ${scale.name}: ${scale.fontSize}${scale.lineHeight ? ` / ${scale.lineHeight}` : ""}${scale.fontWeight ? ` @ ${scale.fontWeight}` : ""} (${scale.usage})`,
		)
	}

	lines.push("")
	lines.push("## Font Weights")
	for (const weight of typography?.fontWeights ?? []) {
		lines.push(`- ${weight.name}: ${weight.value}`)
	}

	lines.push("")
	lines.push("## Line Heights")
	for (const lh of typography?.lineHeights ?? []) {
		lines.push(`- ${lh.name}: ${lh.value}`)
	}

	const typoDoc = documents.documents.find((d) => d.filename === "02-typography.md")
	if (typoDoc) {
		lines.push("")
		lines.push("## Reference Document")
		lines.push(`### ${typoDoc.title}`)
		lines.push(typoDoc.content)
	}

	return lines.join("\n")
}

function buildLayoutShellContext(analysis: AnalysisResult): string {
	const { layoutSystem, essence } = analysis
	const lines: string[] = []

	lines.push("## Design Essence")
	lines.push(`Layout Strategy: ${essence.layoutStrategy}`)
	lines.push("")

	lines.push("## Layout Approach")
	lines.push(`Approach: ${layoutSystem?.approach.value ?? "N/A"}`)
	lines.push("")

	if ((layoutSystem?.containers.length ?? 0) > 0) {
		lines.push("## Containers")
		for (const container of layoutSystem?.containers ?? []) {
			lines.push(
				`- ${container.name}: max-width ${container.maxWidth ?? "auto"}, padding ${container.padding ?? "0"}`,
			)
		}
		lines.push("")
	}

	if ((layoutSystem?.grids.length ?? 0) > 0) {
		lines.push("## Grids")
		for (const grid of layoutSystem?.grids ?? []) {
			lines.push(
				`- ${grid.type}: ${grid.columns ? `${grid.columns} columns` : ""}${grid.gap ? `, gap ${grid.gap}` : ""}`,
			)
		}
		lines.push("")
	}

	if ((layoutSystem?.navigation.length ?? 0) > 0) {
		lines.push("## Navigation Patterns")
		for (const nav of layoutSystem?.navigation ?? []) {
			lines.push(`- ${nav.type}: ${nav.description}`)
		}
		lines.push("")
	}

	return lines.join("\n")
}

function buildShowcasePageContext(analysis: AnalysisResult): string {
	const { essence, designTokens, typography, layoutSystem, componentCatalog } = analysis
	const lines: string[] = []

	lines.push("## Design Essence")
	lines.push(essence.summary)
	lines.push(`Philosophy: ${essence.designPhilosophy}`)
	lines.push("")
	lines.push("Key Characteristics:")
	for (const char of essence.keyCharacteristics) {
		lines.push(`- ${char}`)
	}
	lines.push("")

	lines.push("## Design Strategy")
	lines.push(`- Color: ${essence.colorStrategy}`)
	lines.push(`- Typography: ${essence.typographyStrategy}`)
	lines.push(`- Layout: ${essence.layoutStrategy}`)
	lines.push(`- Component: ${essence.componentStrategy}`)
	lines.push(`- Interaction: ${essence.interactionStrategy}`)
	lines.push("")

	lines.push("## Color Tokens")
	for (const color of designTokens?.colors ?? []) {
		lines.push(`- ${color.name}: ${color.value} (${color.usage})`)
	}
	lines.push("")

	lines.push("## Spacing Tokens")
	for (const spacing of designTokens?.spacing ?? []) {
		lines.push(`- ${spacing.name}: ${spacing.value}`)
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
	for (const scale of typography?.scale ?? []) {
		lines.push(
			`- ${scale.name}: ${scale.fontSize}${scale.lineHeight ? ` / ${scale.lineHeight}` : ""}${scale.fontWeight ? ` @ ${scale.fontWeight}` : ""} (${scale.usage})`,
		)
	}
	lines.push("")

	lines.push("## Layout System")
	lines.push(`Approach: ${layoutSystem?.approach.value ?? "N/A"}`)
	if ((layoutSystem?.containers.length ?? 0) > 0) {
		lines.push("### Containers")
		for (const container of layoutSystem?.containers ?? []) {
			lines.push(
				`- ${container.name}: max-width ${container.maxWidth ?? "auto"}, padding ${container.padding ?? "0"}`,
			)
		}
	}
	if ((layoutSystem?.grids.length ?? 0) > 0) {
		lines.push("### Grids")
		for (const grid of layoutSystem?.grids ?? []) {
			lines.push(
				`- ${grid.type}: ${grid.columns ? `${grid.columns} columns` : ""}${grid.gap ? `, gap ${grid.gap}` : ""}`,
			)
		}
	}
	if ((layoutSystem?.navigation.length ?? 0) > 0) {
		lines.push("### Navigation Patterns")
		for (const nav of layoutSystem?.navigation ?? []) {
			lines.push(`- ${nav.type}: ${nav.description}`)
		}
	}
	lines.push("")

	lines.push("## Component Catalog (reference — components from the analyzed source)")
	for (const comp of componentCatalog?.components ?? []) {
		lines.push(`- ${comp.name} (${comp.category}, ${comp.tier}): ${comp.description}`)
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
