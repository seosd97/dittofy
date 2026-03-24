import type { TemplateContext } from "@defs/templates.js"
import { renderConsistency } from "@domain/rendering/format-utils.js"

export function renderPagesDoc(ctx: TemplateContext): string | null {
	const pages = ctx.analysis.pageStructures
	if (!pages) return null

	const lines: string[] = []
	lines.push("# Page Structures\n")

	if (pages.pages.length > 0) {
		// Overview
		lines.push("## Overview\n")
		lines.push(`Total pages: ${pages.pages.length}`)
		lines.push("")

		// Pages
		lines.push("## Pages\n")
		for (const page of pages.pages) {
			lines.push(`### ${page.name}\n`)
			lines.push(`- **Route:** \`${page.route}\``)
			lines.push(`- **Layout:** ${page.layout}`)
			lines.push(`- **Sections:** ${page.sections.join(", ")}`)
			lines.push(`- **Components:** ${page.components.join(", ")}`)
			lines.push("")
		}

		// Page Patterns
		if (pages.patterns && pages.patterns.length > 0) {
			lines.push("## Page Patterns\n")
			for (const p of pages.patterns) {
				lines.push(`### ${p.name}\n`)
				lines.push(p.description)
				lines.push(`\n**Section Flow:** ${p.sectionFlow.join(" → ")}`)
				lines.push("")
			}
		}
	}

	// Consistency Assessment
	if (pages.consistency) {
		lines.push(renderConsistency(pages.consistency))
		lines.push("")
	}

	// Design Notes
	if (pages.designNotes) {
		const dn = pages.designNotes
		if (dn.observations?.length) {
			lines.push("## Design Notes\n")
			for (const o of dn.observations) lines.push(`- ${o}`)
			lines.push("")
		}
		if (dn.anomalies?.length) {
			lines.push("## Anomalies\n")
			for (const a of dn.anomalies) lines.push(`- ${a}`)
			lines.push("")
		}
	}

	return lines.join("\n")
}
