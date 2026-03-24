import type {
	ComponentCatalog,
	DesignTokens,
	InteractionPatterns,
	LayoutSystem,
	PageStructures,
	ResponsiveStrategy,
	TypographySystem,
} from "@defs/analysis.js"
import type { AnalysisResultMap } from "@defs/aspect-map.js"

/**
 * Shared aspect summarization functions.
 * Used by both cross-aspect context injection (wave-executor) and
 * essence synthesis (essence) to avoid duplicating summary logic.
 */

export function summarizeResults(results: AnalysisResultMap): string[] {
	const sections: string[] = []
	if (results.designTokens) sections.push(summarizeTokens(results.designTokens))
	if (results.typography) sections.push(summarizeTypography(results.typography))
	if (results.layoutSystem) sections.push(summarizeLayout(results.layoutSystem))
	if (results.componentCatalog) sections.push(summarizeComponents(results.componentCatalog))
	if (results.pageStructures) sections.push(summarizePages(results.pageStructures))
	if (results.responsiveStrategy) sections.push(summarizeResponsive(results.responsiveStrategy))
	if (results.interactionPatterns) sections.push(summarizeInteractions(results.interactionPatterns))
	return sections
}

export function summarizeTokens(t: DesignTokens): string {
	const lines: string[] = ["## Design Tokens"]

	if (t.colorGroups && t.colorGroups.length > 0) {
		const totalColors = t.colorGroups.reduce((sum, g) => sum + g.tokens.length, 0)
		lines.push(`- ${totalColors} color tokens in ${t.colorGroups.length} groups`)
		for (const g of t.colorGroups) {
			const level = g.level ? ` (${g.level})` : ""
			const sample = g.tokens
				.slice(0, 3)
				.map((c) => `${c.name}: ${c.value}`)
				.join(", ")
			lines.push(
				`  - ${g.group}${level}: ${g.tokens.length} tokens (${sample}${g.tokens.length > 3 ? ", ..." : ""})`,
			)
		}
	}

	if (t.spacing.length > 0) {
		const values = t.spacing.map((s) => s.value).join(", ")
		lines.push(`- Spacing: ${t.spacing.length} values (${values})`)
	}

	if (t.borderRadius.length > 0) {
		lines.push(`- Border Radius: ${t.borderRadius.map((r) => `${r.name}: ${r.value}`).join(", ")}`)
	}

	if (t.shadows.length > 0) {
		lines.push(`- Shadows: ${t.shadows.map((s) => s.name).join(", ")}`)
	}

	if (t.breakpoints.length > 0) {
		lines.push(`- Breakpoints: ${t.breakpoints.map((b) => `${b.name}: ${b.value}`).join(", ")}`)
	}

	if (t.motion && t.motion.length > 0) {
		lines.push(`- Motion: ${t.motion.map((m) => `${m.name}(${m.duration})`).join(", ")}`)
	}

	if (t.defaultTheme) lines.push(`- Default theme: ${t.defaultTheme}`)

	if (t.designNotes?.observations?.length) {
		lines.push(`- Notes: ${t.designNotes.observations.join(". ")}`)
	}

	return lines.join("\n")
}

export function summarizeTypography(ty: TypographySystem): string {
	const lines: string[] = ["## Typography"]

	if (ty.fontFamilies.length > 0) {
		lines.push(`- Font families: ${ty.fontFamilies.join(", ")}`)
	}
	if (ty.fontFamilyDefs && ty.fontFamilyDefs.length > 0) {
		for (const f of ty.fontFamilyDefs) {
			lines.push(`  - ${f.name} (${f.category}): ${f.usage}`)
		}
	}

	if (ty.scale.length > 0) {
		lines.push(`- Type scale (${ty.scale.length} entries):`)
		for (const s of ty.scale) {
			const lh = s.lineHeight ? `, lh: ${s.lineHeight}` : ""
			const fw = s.fontWeight ? `, weight: ${s.fontWeight}` : ""
			lines.push(`  - ${s.name}: ${s.fontSize}${lh}${fw} — ${s.usage}`)
		}
	}

	if (ty.fontWeights.length > 0) {
		lines.push(`- Weights: ${ty.fontWeights.map((w) => `${w.name}(${w.value})`).join(", ")}`)
	}

	if (ty.letterSpacings && ty.letterSpacings.length > 0) {
		lines.push(
			`- Letter spacings: ${ty.letterSpacings.map((l) => `${l.name}: ${l.value}`).join(", ")}`,
		)
	}

	if (ty.designNotes?.observations?.length) {
		lines.push(`- Notes: ${ty.designNotes.observations.join(". ")}`)
	}

	return lines.join("\n")
}

export function summarizeComponents(c: ComponentCatalog): string {
	const lines: string[] = ["## Component Catalog"]

	const core = c.components.filter((x) => x.tier === "core")
	const ds = c.components.filter((x) => x.tier === "design-system")
	const domain = c.components.filter((x) => x.tier === "domain")

	lines.push(
		`- ${c.components.length} components (core: ${core.length}, design-system: ${ds.length}, domain: ${domain.length})`,
	)

	for (const comp of c.components) {
		const variants = comp.variants.length > 0 ? ` [${comp.variants.join(", ")}]` : ""
		lines.push(
			`- **${comp.name}** (${comp.category}, ${comp.tier}): ${comp.description.slice(0, 80)}${variants}`,
		)
	}

	if (c.patterns.length > 0) {
		lines.push(`- Patterns: ${c.patterns.map((p) => p.name).join(", ")}`)
	}

	return lines.join("\n")
}

export function summarizeLayout(l: LayoutSystem): string {
	const lines: string[] = ["## Layout System"]

	lines.push(`- Approach: ${l.approach}`)

	if (l.containers.length > 0) {
		for (const c of l.containers) {
			const dims: string[] = []
			if (c.maxWidth) dims.push(`max: ${c.maxWidth}`)
			if (c.padding) dims.push(`pad: ${c.padding}`)
			lines.push(`- Container **${c.name}**: ${dims.join(", ") || "no constraints"}`)
		}
	}

	if (l.grids.length > 0) {
		lines.push(
			`- Grids: ${l.grids.map((g) => `${g.type}${g.columns ? `(${g.columns}col)` : ""}`).join(", ")}`,
		)
	}

	if (l.navigation.length > 0) {
		for (const n of l.navigation) {
			lines.push(`- Nav **${n.type}**: ${n.description.slice(0, 80)}`)
		}
	}

	return lines.join("\n")
}

export function summarizePages(p: PageStructures): string {
	const lines: string[] = ["## Page Structures"]

	lines.push(`- ${p.pages.length} pages`)
	for (const page of p.pages) {
		lines.push(
			`- **${page.name}** (${page.route}): layout=${page.layout}, sections: ${page.sections.join(", ")}`,
		)
	}

	if (p.patterns && p.patterns.length > 0) {
		lines.push(`- Patterns: ${p.patterns.map((pt) => pt.name).join(", ")}`)
	}

	return lines.join("\n")
}

export function summarizeResponsive(r: ResponsiveStrategy): string {
	const lines: string[] = ["## Responsive Strategy"]

	if (r.approach) lines.push(`- Approach: ${r.approach}`)

	if (r.breakpoints.length > 0) {
		lines.push(`- Breakpoints: ${r.breakpoints.map((b) => `${b.name}: ${b.value}`).join(", ")}`)
	}

	if (r.patterns.length > 0) {
		for (const p of r.patterns) {
			lines.push(`- **${p.name}** (${p.breakpoint}): ${p.description.slice(0, 80)}`)
		}
	}

	return lines.join("\n")
}

export function summarizeInteractions(ip: InteractionPatterns): string {
	const lines: string[] = ["## Interaction Patterns"]

	if (ip.animations.length > 0) {
		lines.push(
			`- Animations: ${ip.animations.map((a) => `${a.name}(${a.type}, ${a.duration ?? "?"})`).join(", ")}`,
		)
	}

	if (ip.transitions.length > 0) {
		lines.push(
			`- Transitions: ${ip.transitions.map((t) => `${t.property} ${t.duration} ${t.easing}`).join("; ")}`,
		)
	}

	if (ip.gestures.length > 0) {
		lines.push(
			`- Gestures: ${ip.gestures.map((g) => `${g.type}: ${g.description.slice(0, 60)}`).join("; ")}`,
		)
	}

	if (ip.choreography && ip.choreography.length > 0) {
		lines.push(`- Choreography: ${ip.choreography.map((c) => c.name).join(", ")}`)
	}

	return lines.join("\n")
}
