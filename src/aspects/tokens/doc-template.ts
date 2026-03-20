import type { TemplateContext } from "@defs/templates.js"
import { renderConsistency } from "@pipeline/assembly/format-utils.js"

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
			lines.push("| Name | Value | Usage |")
			lines.push("|------|-------|-------|")
			for (const t of group.tokens) {
				lines.push(`| ${t.name} | \`${t.value}\` | ${t.usage} |`)
			}
			lines.push("")
		}
	}

	// Spacing Scale
	if (tokens.spacing.length > 0) {
		lines.push("## Spacing Scale\n")
		lines.push("| Name | Value | Usage |")
		lines.push("|------|-------|-------|")
		for (const s of tokens.spacing) {
			lines.push(`| ${s.name} | \`${s.value}\` | ${s.usage} |`)
		}
		lines.push("")
	}

	// Border Radius
	if (tokens.borderRadius.length > 0) {
		lines.push("## Border Radius\n")
		lines.push("| Name | Value |")
		lines.push("|------|-------|")
		for (const r of tokens.borderRadius) {
			lines.push(`| ${r.name} | \`${r.value}\` |`)
		}
		lines.push("")
	}

	// Shadows
	if (tokens.shadows.length > 0) {
		lines.push("## Shadows\n")
		lines.push("| Name | Value |")
		lines.push("|------|-------|")
		for (const s of tokens.shadows) {
			lines.push(`| ${s.name} | \`${s.value}\` |`)
		}
		lines.push("")
	}

	// Motion Tokens
	if (tokens.motion && tokens.motion.length > 0) {
		lines.push("## Motion Tokens\n")
		lines.push("| Name | Duration | Easing | Usage |")
		lines.push("|------|----------|--------|-------|")
		for (const m of tokens.motion) {
			lines.push(`| ${m.name} | ${m.duration} | ${m.easing} | ${m.usage} |`)
		}
		lines.push("")
	}

	// Breakpoints
	if (tokens.breakpoints.length > 0) {
		lines.push("## Breakpoints\n")
		lines.push("| Name | Value |")
		lines.push("|------|-------|")
		for (const b of tokens.breakpoints) {
			lines.push(`| ${b.name} | \`${b.value}\` |`)
		}
		lines.push("")
	}

	// Z-Index
	if (tokens.zIndex.length > 0) {
		lines.push("## Z-Index\n")
		lines.push("| Name | Value |")
		lines.push("|------|-------|")
		for (const z of tokens.zIndex) {
			lines.push(`| ${z.name} | \`${z.value}\` |`)
		}
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
				lines.push("| Token | Value | Derivation |")
				lines.push("|-------|-------|------------|")
				for (const override of variant.colorOverrides) {
					const derivation = override.derivation ?? "-"
					lines.push(`| ${override.tokenName} | \`${override.value}\` | ${derivation} |`)
				}
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
