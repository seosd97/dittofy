import type { TemplateContext } from "@defs/templates.js"
import { mdTable, renderConsistency } from "@pipeline/assembly/format-utils.js"

export function renderResponsiveDoc(ctx: TemplateContext): string | null {
	const responsive = ctx.analysis.responsiveStrategy
	if (!responsive) return null
	if (responsive.breakpoints.length === 0 && responsive.patterns.length === 0) return null

	const lines: string[] = []
	lines.push("# Responsive Strategy\n")

	// Approach
	if (responsive.approach) {
		lines.push("## Approach\n")
		lines.push(responsive.approach)
		lines.push("")
	}

	// Breakpoints
	if (responsive.breakpoints.length > 0) {
		lines.push("## Breakpoints\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				responsive.breakpoints.map((b) => [b.name, `\`${b.value}\``]),
			),
		)
		lines.push("")
	}

	// Responsive Patterns
	if (responsive.patterns.length > 0) {
		lines.push("## Responsive Patterns\n")
		for (const p of responsive.patterns) {
			lines.push(`- **${p.name}** (${p.breakpoint}): ${p.description}`)
		}
		lines.push("")
	}

	// Component Adaptations
	if (responsive.componentAdaptations && responsive.componentAdaptations.length > 0) {
		lines.push("## Component Adaptations\n")
		lines.push(
			mdTable(
				["Component", "Breakpoint", "Adaptation"],
				responsive.componentAdaptations.map((a) => [a.component, a.breakpoint, a.adaptation]),
			),
		)
		lines.push("")
	}

	// Layout Adaptations
	if (responsive.layoutAdaptations && responsive.layoutAdaptations.length > 0) {
		lines.push("## Layout Adaptations\n")
		lines.push(
			mdTable(
				["Layout Element", "Breakpoint", "Behavior"],
				responsive.layoutAdaptations.map((a) => [a.layoutElement, a.breakpoint, a.behavior]),
			),
		)
		lines.push("")
	}

	// Consistency Assessment
	if (responsive.consistency) {
		lines.push(renderConsistency(responsive.consistency))
		lines.push("")
	}

	return lines.join("\n")
}
