import type { TemplateContext } from "@defs/templates.js"
import { mdTable, renderConsistency } from "@pipeline/assembly/format-utils.js"

export function renderTypographyDoc(ctx: TemplateContext): string | null {
	const typo = ctx.analysis.typography
	if (!typo) return null
	if (typo.scale.length === 0) return null

	const lines: string[] = []
	lines.push("# Typography\n")

	// Font Families
	lines.push("## Font Families\n")
	if (typo.fontFamilyDefs && typo.fontFamilyDefs.length > 0) {
		for (const f of typo.fontFamilyDefs) {
			lines.push(`### ${f.name}\n`)
			lines.push(`- **Category:** ${f.category}`)
			lines.push(`- **Fallback:** ${f.fallbackStack}`)
			lines.push(`- **Usage:** ${f.usage}`)
			lines.push("")
		}
	} else {
		for (const f of typo.fontFamilies) {
			lines.push(`- ${f}`)
		}
		lines.push("")
	}

	// Type Scale
	lines.push("## Type Scale\n")
	lines.push(
		mdTable(
			["Name", "Font Size", "Line Height", "Font Weight", "Letter Spacing", "Usage"],
			typo.scale.map((s) => [
				s.name,
				s.fontSize,
				s.lineHeight ?? "-",
				s.fontWeight ?? "-",
				"-",
				s.usage,
			]),
		),
	)
	lines.push("")

	// Font Weights
	if (typo.fontWeights.length > 0) {
		lines.push("## Font Weights\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				typo.fontWeights.map((w) => [w.name, `\`${w.value}\``]),
			),
		)
		lines.push("")
	}

	// Line Heights
	if (typo.lineHeights.length > 0) {
		lines.push("## Line Heights\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				typo.lineHeights.map((l) => [l.name, `\`${l.value}\``]),
			),
		)
		lines.push("")
	}

	// Letter Spacings
	if (typo.letterSpacings && typo.letterSpacings.length > 0) {
		lines.push("## Letter Spacings\n")
		lines.push(
			mdTable(
				["Name", "Value", "Usage"],
				typo.letterSpacings.map((l) => [l.name, `\`${l.value}\``, l.usage]),
			),
		)
		lines.push("")
	}

	// Responsive Scaling
	if (typo.responsiveScaling && typo.responsiveScaling.length > 0) {
		lines.push("## Responsive Scaling\n")
		lines.push(
			mdTable(
				["Breakpoint", "Scale Factor", "Description"],
				typo.responsiveScaling.map((r) => [r.breakpoint, String(r.scaleFactor), r.description]),
			),
		)
		lines.push("")
	}

	// Consistency Assessment
	if (typo.consistency) {
		lines.push(renderConsistency(typo.consistency))
		lines.push("")
	}

	return lines.join("\n")
}
