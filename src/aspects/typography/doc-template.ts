import type { TemplateContext } from "@defs/templates.js"
import { renderConsistency } from "@pipeline/assembly/format-utils.js"

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
	lines.push("| Name | Font Size | Line Height | Font Weight | Letter Spacing | Usage |")
	lines.push("|------|-----------|-------------|-------------|----------------|-------|")
	for (const s of typo.scale) {
		const lh = s.lineHeight ?? "-"
		const fw = s.fontWeight ?? "-"
		const ls = "-"
		lines.push(`| ${s.name} | ${s.fontSize} | ${lh} | ${fw} | ${ls} | ${s.usage} |`)
	}
	lines.push("")

	// Font Weights
	if (typo.fontWeights.length > 0) {
		lines.push("## Font Weights\n")
		lines.push("| Name | Value |")
		lines.push("|------|-------|")
		for (const w of typo.fontWeights) {
			lines.push(`| ${w.name} | \`${w.value}\` |`)
		}
		lines.push("")
	}

	// Line Heights
	if (typo.lineHeights.length > 0) {
		lines.push("## Line Heights\n")
		lines.push("| Name | Value |")
		lines.push("|------|-------|")
		for (const l of typo.lineHeights) {
			lines.push(`| ${l.name} | \`${l.value}\` |`)
		}
		lines.push("")
	}

	// Letter Spacings
	if (typo.letterSpacings && typo.letterSpacings.length > 0) {
		lines.push("## Letter Spacings\n")
		lines.push("| Name | Value | Usage |")
		lines.push("|------|-------|-------|")
		for (const l of typo.letterSpacings) {
			lines.push(`| ${l.name} | \`${l.value}\` | ${l.usage} |`)
		}
		lines.push("")
	}

	// Responsive Scaling
	if (typo.responsiveScaling && typo.responsiveScaling.length > 0) {
		lines.push("## Responsive Scaling\n")
		lines.push("| Breakpoint | Scale Factor | Description |")
		lines.push("|------------|--------------|-------------|")
		for (const r of typo.responsiveScaling) {
			lines.push(`| ${r.breakpoint} | ${r.scaleFactor} | ${r.description} |`)
		}
		lines.push("")
	}

	// Consistency Assessment
	if (typo.consistency) {
		lines.push(renderConsistency(typo.consistency))
		lines.push("")
	}

	return lines.join("\n")
}
