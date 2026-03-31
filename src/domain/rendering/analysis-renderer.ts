import type {
	AnalysisResult,
	ComponentCatalog,
	ConsistencyMetrics,
	DesignEssence,
	DesignTokens,
	InteractionPatterns,
	LayoutSystem,
	PageStructures,
	ResponsiveStrategy,
	TechStack,
	TypographySystem,
} from "@defs/analysis.js"
import { mdTable, sanitizeTableCell, truncateValue } from "./format-utils.js"

export function renderAnalysisMarkdown(analysis: AnalysisResult): string {
	const lines: string[] = []

	lines.push("# Design System Analysis\n")

	lines.push(renderTechStack(analysis.techStack))
	lines.push(renderEssence(analysis.essence))
	lines.push("---\n")
	lines.push(
		renderAspectSection(
			"Design Tokens",
			analysis.designTokens,
			"designTokens",
			analysis.failedAnalyzers,
			renderDesignTokens,
		),
	)
	lines.push("---\n")
	lines.push(
		renderAspectSection(
			"Typography",
			analysis.typography,
			"typography",
			analysis.failedAnalyzers,
			renderTypography,
		),
	)
	lines.push("---\n")
	lines.push(
		renderAspectSection(
			"Component Catalog",
			analysis.componentCatalog,
			"componentCatalog",
			analysis.failedAnalyzers,
			renderComponents,
		),
	)
	lines.push("---\n")
	lines.push(
		renderAspectSection(
			"Layout System",
			analysis.layoutSystem,
			"layoutSystem",
			analysis.failedAnalyzers,
			renderLayout,
		),
	)
	lines.push("---\n")
	lines.push(
		renderAspectSection(
			"Page Structures",
			analysis.pageStructures,
			"pageStructures",
			analysis.failedAnalyzers,
			renderPages,
		),
	)
	lines.push("---\n")
	lines.push(
		renderAspectSection(
			"Responsive Strategy",
			analysis.responsiveStrategy,
			"responsiveStrategy",
			analysis.failedAnalyzers,
			renderResponsive,
		),
	)
	lines.push("---\n")
	lines.push(
		renderAspectSection(
			"Interactions",
			analysis.interactionPatterns,
			"interactionPatterns",
			analysis.failedAnalyzers,
			renderInteractions,
		),
	)
	lines.push("---\n")
	lines.push(renderMeta(analysis))

	return lines.filter(Boolean).join("\n")
}

// ── Section Helpers ──────────────────────────────────────────

function renderAspectSection<T>(
	title: string,
	data: T | null,
	analyzerName: string,
	failedAnalyzers: string[],
	renderer: (data: T) => string,
): string {
	const lines: string[] = []
	lines.push(`## ${title}\n`)

	if (data == null) {
		if (failedAnalyzers.includes(analyzerName)) {
			lines.push(`*Analysis failed — ${analyzerName} was not extracted*\n`)
		} else {
			lines.push("*Not included in analysis*\n")
		}
		return lines.join("\n")
	}

	lines.push(renderer(data))
	return lines.join("\n")
}

function consistencyLine(c: ConsistencyMetrics | null | undefined): string {
	if (!c) return ""
	return `*Consistency: ${c.score}/100 (${c.maturity})*\n`
}

function renderNotes(
	designNotes: { observations: string[]; anomalies?: string[] } | null | undefined,
): string {
	if (!designNotes) return ""
	const lines: string[] = []
	if (designNotes.observations.length > 0) {
		lines.push(`*Notes: ${designNotes.observations.join(". ")}*`)
	}
	if (designNotes.anomalies && designNotes.anomalies.length > 0) {
		lines.push(`*Anomalies: ${designNotes.anomalies.join(". ")}*`)
	}
	return lines.length > 0 ? `\n${lines.join("\n")}\n` : ""
}

// ── Tech Stack ───────────────────────────────────────────────

function renderTechStack(ts: TechStack): string {
	const lines: string[] = ["## Tech Stack\n"]
	lines.push(`- Framework: ${ts.framework.value}`)
	lines.push(`- Language: ${ts.language.value}`)
	const styling =
		typeof ts.styling.value === "string" ? ts.styling.value : ts.styling.value.approach
	lines.push(`- Styling: ${styling}`)
	if (ts.uiLibrary) lines.push(`- UI Library: ${ts.uiLibrary.value}`)
	if (ts.stateManagement) lines.push(`- State Management: ${ts.stateManagement.value}`)
	if (ts.buildTool) lines.push(`- Build Tool: ${ts.buildTool.value}`)
	lines.push("")
	return lines.join("\n")
}

// ── Essence ──────────────────────────────────────────────────

function renderEssence(e: DesignEssence): string {
	const lines: string[] = ["## Design Essence\n"]
	lines.push(`> ${e.summary}\n`)
	lines.push(`**Philosophy**: ${e.designPhilosophy}`)
	lines.push(`**App Type**: ${e.appType}`)
	lines.push("**Key Characteristics**:")
	for (const c of e.keyCharacteristics) {
		lines.push(`- ${c}`)
	}
	lines.push("")
	lines.push("### Strategies")
	lines.push(`- **Color**: ${e.colorStrategy}`)
	lines.push(`- **Typography**: ${e.typographyStrategy}`)
	lines.push(`- **Layout**: ${e.layoutStrategy}`)
	lines.push(`- **Component**: ${e.componentStrategy}`)
	lines.push(`- **Interaction**: ${e.interactionStrategy}`)
	lines.push("")
	return lines.join("\n")
}

// ── Design Tokens ────────────────────────────────────────────

function renderDesignTokens(tokens: DesignTokens): string {
	const lines: string[] = []

	lines.push(consistencyLine(tokens.consistency))

	if (tokens.colorGroups && tokens.colorGroups.length > 0) {
		lines.push("### Color Groups\n")
		for (const group of tokens.colorGroups) {
			const level = group.level ? ` (${group.level})` : ""
			lines.push(`#### ${group.group}${level}\n`)
			lines.push(
				mdTable(
					["Name", "Value", "Usage"],
					group.tokens.map((t) => [t.name, `\`${t.value}\``, t.usage]),
				),
			)
		}
	}

	if (tokens.spacing.length > 0) {
		lines.push("### Spacing\n")
		lines.push(
			mdTable(
				["Name", "Value", "Usage"],
				tokens.spacing.map((s) => [s.name, `\`${s.value}\``, s.usage]),
			),
		)
	}

	if (tokens.borderRadius.length > 0) {
		lines.push("### Border Radius\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				tokens.borderRadius.map((r) => [r.name, `\`${r.value}\``]),
			),
		)
	}

	if (tokens.shadows.length > 0) {
		lines.push("### Shadows\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				tokens.shadows.map((s) => [s.name, `\`${s.value}\``]),
			),
		)
	}

	if (tokens.motion && tokens.motion.length > 0) {
		lines.push("### Motion\n")
		lines.push(
			mdTable(
				["Name", "Duration", "Easing", "Usage"],
				tokens.motion.map((m) => [m.name, m.duration, m.easing, m.usage]),
			),
		)
	}

	if (tokens.breakpoints.length > 0) {
		lines.push("### Breakpoints\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				tokens.breakpoints.map((b) => [b.name, `\`${b.value}\``]),
			),
		)
	}

	if (tokens.zIndex.length > 0) {
		lines.push("### Z-Index\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				tokens.zIndex.map((z) => [z.name, `\`${z.value}\``]),
			),
		)
	}

	lines.push(renderNotes(tokens.designNotes))

	return lines.filter(Boolean).join("\n")
}

// ── Typography ───────────────────────────────────────────────

function renderTypography(typo: TypographySystem): string {
	const lines: string[] = []

	lines.push(consistencyLine(typo.consistency))

	if (typo.fontFamilyDefs && typo.fontFamilyDefs.length > 0) {
		lines.push("### Font Families\n")
		for (const f of typo.fontFamilyDefs) {
			lines.push(`- **${f.name}** (${f.category}): ${f.fallbackStack} — ${f.usage}`)
		}
		lines.push("")
	} else if (typo.fontFamilies.length > 0) {
		lines.push("### Font Families\n")
		for (const f of typo.fontFamilies) {
			lines.push(`- ${f}`)
		}
		lines.push("")
	}

	if (typo.scale.length > 0) {
		lines.push("### Type Scale\n")
		lines.push(
			mdTable(
				["Name", "Size", "Line Height", "Weight", "Usage"],
				typo.scale.map((s) => [
					s.name,
					s.fontSize,
					s.lineHeight ?? "-",
					s.fontWeight ?? "-",
					s.usage,
				]),
			),
		)
	}

	if (typo.fontWeights.length > 0) {
		lines.push("### Font Weights\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				typo.fontWeights.map((w) => [w.name, w.value]),
			),
		)
	}

	if (typo.lineHeights.length > 0) {
		lines.push("### Line Heights\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				typo.lineHeights.map((lh) => [lh.name, lh.value]),
			),
		)
	}

	if (typo.letterSpacings && typo.letterSpacings.length > 0) {
		lines.push("### Letter Spacings\n")
		lines.push(
			mdTable(
				["Name", "Value", "Usage"],
				typo.letterSpacings.map((ls) => [ls.name, ls.value, ls.usage]),
			),
		)
	}

	lines.push(renderNotes(typo.designNotes))

	return lines.filter(Boolean).join("\n")
}

// ── Components ───────────────────────────────────────────────

function renderComponents(catalog: ComponentCatalog): string {
	const lines: string[] = []

	lines.push(consistencyLine(catalog.consistency))

	const total = catalog.components.length
	const core = catalog.components.filter((c) => c.tier === "core").length
	const ds = catalog.components.filter((c) => c.tier === "design-system").length
	const domain = catalog.components.filter((c) => c.tier === "domain").length

	lines.push("### Overview\n")
	lines.push(`- Total: ${total} components`)
	lines.push(`- Core: ${core} | Design System: ${ds} | Domain: ${domain}`)
	lines.push("")

	if (catalog.components.length > 0) {
		lines.push("### Components\n")
		for (const comp of catalog.components) {
			lines.push(`#### ${comp.name} (${comp.category}, ${comp.tier})\n`)
			lines.push(comp.description)
			if (comp.variants.length > 0) {
				lines.push(`- **Variants**: ${comp.variants.join(", ")}`)
			}
			if (comp.states && comp.states.length > 0) {
				lines.push(`- **States**: ${comp.states.map((s) => s.name).join(", ")}`)
			}
			if (comp.sizes && comp.sizes.length > 0) {
				lines.push(`- **Sizes**: ${comp.sizes.join(", ")}`)
			}
			lines.push("")
		}
	}

	if (catalog.patterns.length > 0) {
		lines.push("### Patterns\n")
		for (const p of catalog.patterns) {
			lines.push(`- **${p.name}**: ${p.description} (${p.components.join(", ")})`)
		}
		lines.push("")
	}

	lines.push(renderNotes(catalog.designNotes))

	return lines.filter(Boolean).join("\n")
}

// ── Layout ───────────────────────────────────────────────────

function renderLayout(layout: LayoutSystem): string {
	const lines: string[] = []

	lines.push(consistencyLine(layout.consistency))

	lines.push("### Approach\n")
	lines.push(layout.approach)
	lines.push("")

	if (layout.containers.length > 0) {
		lines.push("### Containers\n")
		lines.push(
			mdTable(
				["Name", "Max Width", "Padding"],
				layout.containers.map((c) => [c.name, c.maxWidth ?? "-", c.padding ?? "-"]),
			),
		)
	}

	if (layout.grids.length > 0) {
		lines.push("### Grid Systems\n")
		lines.push(
			mdTable(
				["Type", "Columns", "Gap"],
				layout.grids.map((g) => [g.type, String(g.columns ?? "-"), g.gap ?? "-"]),
			),
		)
	}

	if (layout.navigation.length > 0) {
		lines.push("### Navigation\n")
		for (const n of layout.navigation) {
			lines.push(`- **${n.type}**: ${n.description}`)
		}
		lines.push("")
	}

	if (layout.spacingRhythm && layout.spacingRhythm.length > 0) {
		lines.push("### Spacing Rhythm\n")
		lines.push(
			mdTable(
				["Name", "Value", "Usage"],
				layout.spacingRhythm.map((s) => [s.name, s.value, s.usage]),
			),
		)
	}

	lines.push(renderNotes(layout.designNotes))

	return lines.filter(Boolean).join("\n")
}

// ── Pages ────────────────────────────────────────────────────

function renderPages(pages: PageStructures): string {
	const lines: string[] = []

	lines.push(consistencyLine(pages.consistency))

	if (pages.pages.length > 0) {
		lines.push("### Pages\n")
		for (const p of pages.pages) {
			lines.push(`#### ${p.name} (${p.route})\n`)
			lines.push(`- Layout: ${p.layout}`)
			lines.push(`- Sections: ${p.sections.join(", ")}`)
			if (p.components.length > 0) {
				lines.push(`- Components: ${p.components.join(", ")}`)
			}
			lines.push("")
		}
	}

	if (pages.patterns && pages.patterns.length > 0) {
		lines.push("### Page Patterns\n")
		for (const p of pages.patterns) {
			lines.push(`- **${p.name}**: ${p.description} (flow: ${p.sectionFlow.join(" → ")})`)
		}
		lines.push("")
	}

	lines.push(renderNotes(pages.designNotes))

	return lines.filter(Boolean).join("\n")
}

// ── Responsive ───────────────────────────────────────────────

function renderResponsive(rs: ResponsiveStrategy): string {
	const lines: string[] = []

	lines.push(consistencyLine(rs.consistency))

	if (rs.approach) {
		lines.push("### Approach\n")
		lines.push(rs.approach)
		lines.push("")
	}

	if (rs.breakpoints.length > 0) {
		lines.push("### Breakpoints\n")
		lines.push(
			mdTable(
				["Name", "Value"],
				rs.breakpoints.map((b) => [b.name, b.value]),
			),
		)
	}

	if (rs.patterns.length > 0) {
		lines.push("### Patterns\n")
		for (const p of rs.patterns) {
			lines.push(`- **${p.name}** (${p.breakpoint}): ${p.description}`)
		}
		lines.push("")
	}

	if (rs.componentAdaptations && rs.componentAdaptations.length > 0) {
		lines.push("### Component Adaptations\n")
		lines.push(
			mdTable(
				["Component", "Breakpoint", "Adaptation"],
				rs.componentAdaptations.map((a) => [a.component, a.breakpoint, a.adaptation]),
			),
		)
	}

	if (rs.layoutAdaptations && rs.layoutAdaptations.length > 0) {
		lines.push("### Layout Adaptations\n")
		lines.push(
			mdTable(
				["Element", "Breakpoint", "Behavior"],
				rs.layoutAdaptations.map((a) => [a.layoutElement, a.breakpoint, a.behavior]),
			),
		)
	}

	lines.push(renderNotes(rs.designNotes))

	return lines.filter(Boolean).join("\n")
}

// ── Interactions ─────────────────────────────────────────────

function renderInteractions(ip: InteractionPatterns): string {
	const lines: string[] = []

	lines.push(consistencyLine(ip.consistency))

	if (ip.animations.length > 0) {
		lines.push("### Animations\n")
		lines.push(
			mdTable(
				["Name", "Type", "Duration", "Easing", "Trigger"],
				ip.animations.map((a) => [
					a.name,
					a.type,
					a.duration ?? "-",
					a.easing ?? "-",
					a.trigger ?? "-",
				]),
			),
		)
	}

	if (ip.transitions.length > 0) {
		lines.push("### Transitions\n")
		lines.push(
			mdTable(
				["Property", "Duration", "Easing"],
				ip.transitions.map((t) => [t.property, t.duration, t.easing]),
			),
		)
	}

	if (ip.gestures.length > 0) {
		lines.push("### Gestures\n")
		for (const g of ip.gestures) {
			lines.push(`- **${g.type}**: ${g.description}`)
		}
		lines.push("")
	}

	if (ip.choreography && ip.choreography.length > 0) {
		lines.push("### Choreography\n")
		for (const c of ip.choreography) {
			lines.push(`- **${c.name}**: ${c.description} (${c.steps.join(" → ")})`)
		}
		lines.push("")
	}

	lines.push(renderNotes(ip.designNotes))

	return lines.filter(Boolean).join("\n")
}

// ── Meta ─────────────────────────────────────────────────────

function renderMeta(analysis: AnalysisResult): string {
	const lines: string[] = ["## Analysis Meta\n"]
	const meta = analysis.meta

	if (meta) {
		lines.push(`- Analyzed: ${meta.analyzedAt}`)
		lines.push(`- Source: ${meta.source}`)
		if (meta.tier) lines.push(`- Tier: ${meta.tier}`)
		lines.push(`- Duration: ${Math.round(meta.duration / 1000)}s`)
	}

	if (analysis.failedAnalyzers.length > 0) {
		lines.push(`- Failed: ${analysis.failedAnalyzers.join(", ")}`)
	}

	lines.push("")
	return lines.join("\n")
}
