import type { TemplateContext } from "@defs/templates.js"
import { renderConsistency } from "@pipeline/assembly/format-utils.js"

export function renderLayoutDoc(ctx: TemplateContext): string | null {
	const layout = ctx.analysis.layoutSystem
	if (!layout) return null
	if (layout.containers.length === 0 && layout.grids.length === 0) return null

	const lines: string[] = []
	lines.push("# Layout System\n")

	// Approach
	lines.push("## Approach\n")
	lines.push(layout.approach)
	lines.push("")

	// Grid System
	if (layout.grids.length > 0) {
		lines.push("## Grid System\n")
		for (const grid of layout.grids) {
			lines.push(`### ${grid.type}\n`)
			if (grid.columns != null) {
				lines.push(`- **Columns:** ${grid.columns}`)
			}
			if (grid.gap) {
				lines.push(`- **Gap:** ${grid.gap}`)
			}
			lines.push("")
		}
	}

	// Containers
	if (layout.containers.length > 0) {
		lines.push("## Containers\n")
		for (const c of layout.containers) {
			lines.push(`### ${c.name}\n`)
			if (c.maxWidth) {
				lines.push(`- **Max Width:** ${c.maxWidth}`)
			}
			if (c.padding) {
				lines.push(`- **Padding:** ${c.padding}`)
			}
			if (c.responsiveOverrides && c.responsiveOverrides.length > 0) {
				lines.push("\n**Responsive Overrides:**\n")
				lines.push("| Breakpoint | Max Width | Padding | Columns | Gap |")
				lines.push("|------------|-----------|---------|---------|-----|")
				for (const o of c.responsiveOverrides) {
					const mw = o.maxWidth ?? "-"
					const p = o.padding ?? "-"
					const col = o.columns != null ? String(o.columns) : "-"
					const gap = o.gap ?? "-"
					lines.push(`| ${o.breakpoint} | ${mw} | ${p} | ${col} | ${gap} |`)
				}
			}
			lines.push("")
		}
	}

	// Navigation Patterns
	if (layout.navigation.length > 0) {
		lines.push("## Navigation Patterns\n")
		for (const n of layout.navigation) {
			lines.push(`- **${n.type}:** ${n.description}`)
		}
		lines.push("")
	}

	// Spacing Rhythm
	if (layout.spacingRhythm && layout.spacingRhythm.length > 0) {
		lines.push("## Spacing Rhythm\n")
		lines.push("| Name | Value | Usage |")
		lines.push("|------|-------|-------|")
		for (const s of layout.spacingRhythm) {
			lines.push(`| ${s.name} | \`${s.value}\` | ${s.usage} |`)
		}
		lines.push("")
	}

	// Consistency Assessment
	if (layout.consistency) {
		lines.push(renderConsistency(layout.consistency))
		lines.push("")
	}

	return lines.join("\n")
}
