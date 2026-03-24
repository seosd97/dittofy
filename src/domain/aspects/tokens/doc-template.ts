import type { TemplateContext } from "@defs/templates.js"
import { mdTable, renderConsistency } from "@domain/rendering/format-utils.js"

export function renderTokensDoc(ctx: TemplateContext): string | null {
	const tokens = ctx.analysis.designTokens
	if (!tokens) return null
	if ((!tokens.colorGroups || tokens.colorGroups.length === 0) && tokens.spacing.length === 0)
		return null

	const lines: string[] = []
	lines.push("# Design Tokens\n")

	// Design Philosophy
	lines.push("## Design Philosophy\n")
	lines.push(ctx.analysis.essence.colorStrategy)
	lines.push("")

	// Color Palette
	if (tokens.colorGroups && tokens.colorGroups.length > 0) {
		lines.push("## Color Palette\n")
		for (const group of tokens.colorGroups) {
			const level = group.level ? ` (${group.level})` : ""
			lines.push(`### ${group.group}${level}\n`)
			lines.push(
				mdTable(
					["Name", "Value", "Usage"],
					group.tokens.map((t) => [t.name, `\`${t.value}\``, t.usage]),
				),
			)
			lines.push("")
		}
	}

	// Spacing Scale
	if (tokens.spacing.length > 0) {
		lines.push("## Spacing Scale\n")
		lines.push(
			mdTable(
				["Name", "Value", "Usage"],
				tokens.spacing.map((s) => [s.name, `\`${s.value}\``, s.usage]),
			),
		)
		lines.push("")
	}

	// Border Radius
	if (tokens.borderRadius.length > 0) {
		lines.push("## Border Radius\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				tokens.borderRadius.map((r) => [r.name, `\`${r.value}\``]),
			),
		)
		lines.push("")
	}

	// Shadows
	if (tokens.shadows.length > 0) {
		lines.push("## Shadows\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				tokens.shadows.map((s) => [s.name, `\`${s.value}\``]),
			),
		)
		lines.push("")
	}

	// Motion Tokens
	if (tokens.motion && tokens.motion.length > 0) {
		lines.push("## Motion Tokens\n")
		lines.push(
			mdTable(
				["Name", "Duration", "Easing", "Usage"],
				tokens.motion.map((m) => [m.name, m.duration, m.easing, m.usage]),
			),
		)
		lines.push("")
	}

	// Breakpoints
	if (tokens.breakpoints.length > 0) {
		lines.push("## Breakpoints\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				tokens.breakpoints.map((b) => [b.name, `\`${b.value}\``]),
			),
		)
		lines.push("")
	}

	// Z-Index
	if (tokens.zIndex.length > 0) {
		lines.push("## Z-Index\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				tokens.zIndex.map((z) => [z.name, `\`${z.value}\``]),
			),
		)
		lines.push("")
	}

	// Theme Variants
	if (tokens.themeVariants && tokens.themeVariants.length > 0) {
		lines.push("## Theme Variants\n")
		if (tokens.defaultTheme) {
			lines.push(`**Default Theme:** ${tokens.defaultTheme}\n`)
		}
		for (const variant of tokens.themeVariants) {
			lines.push(`### ${variant.name}\n`)
			lines.push(`**Surface Strategy:** ${variant.surfaceStrategy}`)
			if (variant.colorOverrides.length > 0) {
				lines.push(
					mdTable(
						["Token", "Value", "Derivation"],
						variant.colorOverrides.map((o) => [o.tokenName, `\`${o.value}\``, o.derivation ?? "-"]),
					),
				)
			}
			lines.push("")
		}
	}

	// Consistency Assessment
	if (tokens.consistency) {
		lines.push(renderConsistency(tokens.consistency))
		lines.push("")
	}

	return lines.join("\n")
}
