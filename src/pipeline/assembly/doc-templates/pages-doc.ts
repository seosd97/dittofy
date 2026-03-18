import type { TemplateContext } from "@defs/templates.js"
import { renderConsistency } from "../format-utils.js"

export function renderPagesDoc(ctx: TemplateContext): string | null {
	const pages = ctx.analysis.pageStructures
	if (!pages) return null
	if (pages.pages.length === 0) return null

	const lines: string[] = []
	lines.push("# Page Structures\n")

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

		// Section Details
		if (page.sectionDetails && page.sectionDetails.length > 0) {
			lines.push("\n**Section Details:**\n")
			for (const s of page.sectionDetails) {
				const weight = s.hierarchyWeight ? ` [${s.hierarchyWeight}]` : ""
				const flow = s.flowRelation ? ` (${s.flowRelation})` : ""
				lines.push(`- **${s.name}**${weight}${flow}`)
				if (s.components && s.components.length > 0) {
					lines.push(`  - Components: ${s.components.join(", ")}`)
				}
			}
		}

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

	// Consistency Assessment
	if (pages.consistency) {
		lines.push(renderConsistency(pages.consistency))
		lines.push("")
	}

	return lines.join("\n")
}
