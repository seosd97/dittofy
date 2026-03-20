import type { TemplateContext } from "@defs/templates.js"
import { renderConsistency } from "@pipeline/assembly/format-utils.js"

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
		lines.push("| Name | Value |")
		lines.push("|------|-------|")
		for (const b of responsive.breakpoints) {
			lines.push(`| ${b.name} | \`${b.value}\` |`)
		}
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
		lines.push("| Component | Breakpoint | Adaptation |")
		lines.push("|-----------|------------|------------|")
		for (const a of responsive.componentAdaptations) {
			lines.push(`| ${a.component} | ${a.breakpoint} | ${a.adaptation} |`)
		}
		lines.push("")
	}

	// Layout Adaptations
	if (responsive.layoutAdaptations && responsive.layoutAdaptations.length > 0) {
		lines.push("## Layout Adaptations\n")
		lines.push("| Layout Element | Breakpoint | Behavior |")
		lines.push("|----------------|------------|----------|")
		for (const a of responsive.layoutAdaptations) {
			lines.push(`| ${a.layoutElement} | ${a.breakpoint} | ${a.behavior} |`)
		}
		lines.push("")
	}

	// Consistency Assessment
	if (responsive.consistency) {
		lines.push(renderConsistency(responsive.consistency))
		lines.push("")
	}

	return lines.join("\n")
}
