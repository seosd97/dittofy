import type {
	ComponentCatalog,
	DesignTokens,
	InteractionPatterns,
	LayoutSystem,
	ResponsiveStrategy,
	TypographySystem,
} from "@defs/analysis.js"
import { mdTable } from "@domain/rendering/format-utils.js"

export function buildColorReference(
	tokens: DesignTokens | null,
	options?: { compact?: boolean },
): string {
	if (!tokens?.colorGroups || tokens.colorGroups.length === 0) return ""

	const sections: string[] = []
	sections.push(options?.compact ? "### Colors" : "### Colors (by group)")
	for (const group of tokens.colorGroups) {
		const level = group.level ? ` (${group.level})` : ""
		sections.push(`\n**${group.group}${level}**:`)
		sections.push(
			mdTable(
				["Name", "Value", "Usage"],
				group.tokens.map((t) => [t.name, `\`${t.value}\``, t.usage]),
			),
		)
	}
	return sections.join("\n")
}

export function buildSpacingReference(tokens: DesignTokens | null): string {
	if (!tokens || tokens.spacing.length === 0) return ""
	return `\n### Spacing\n${mdTable(
		["Name", "Value", "Usage"],
		tokens.spacing.map((t) => [t.name, `\`${t.value}\``, t.usage]),
	)}`
}

export function buildBorderRadiusReference(tokens: DesignTokens | null): string {
	if (!tokens || tokens.borderRadius.length === 0) return ""
	return `\n### Border Radius\n${mdTable(
		["Name", "Value"],
		tokens.borderRadius.map((t) => [t.name, `\`${t.value}\``]),
	)}`
}

export function buildShadowsReference(tokens: DesignTokens | null): string {
	if (!tokens || tokens.shadows.length === 0) return ""
	return `\n### Shadows\n${mdTable(
		["Name", "Value"],
		tokens.shadows.map((t) => [t.name, `\`${t.value}\``]),
	)}`
}

export function buildMotionReference(tokens: DesignTokens | null): string {
	if (!tokens?.motion || tokens.motion.length === 0) return ""
	return `\n### Motion Tokens\n${mdTable(
		["Name", "Duration", "Easing", "Usage"],
		tokens.motion.map((t) => [t.name, t.duration, t.easing, t.usage]),
	)}`
}

export function buildBreakpointsReference(
	breakpoints: Array<{ name: string; value: string }>,
	label?: string,
): string {
	if (breakpoints.length === 0) return ""
	return `\n### ${label ?? "Breakpoints"}\n${mdTable(
		["Name", "Value"],
		breakpoints.map((b) => [b.name, `\`${b.value}\``]),
	)}`
}

export function buildZIndexReference(tokens: DesignTokens | null): string {
	if (!tokens || tokens.zIndex.length === 0) return ""
	return `\n### Z-Index\n${mdTable(
		["Name", "Value"],
		tokens.zIndex.map((t) => [t.name, `\`${t.value}\``]),
	)}`
}

export function buildThemeVariantsReference(tokens: DesignTokens | null): string {
	if (!tokens?.themeVariants || tokens.themeVariants.length === 0) return ""

	const sections: string[] = []
	sections.push("\n### Theme Variants")
	if (tokens.defaultTheme) {
		sections.push(`**Default Theme:** ${tokens.defaultTheme}`)
	}
	for (const variant of tokens.themeVariants) {
		sections.push(`\n**${variant.name}** (${variant.surfaceStrategy}):`)
		sections.push(
			mdTable(
				["Token", "Value", "Derivation"],
				variant.colorOverrides.map((o) => [o.tokenName, `\`${o.value}\``, o.derivation ?? "-"]),
			),
		)
	}
	return sections.join("\n")
}

export function buildTypographyReference(typo: TypographySystem | null): string {
	if (!typo) return ""

	const sections: string[] = []

	if (typo.fontFamilyDefs && typo.fontFamilyDefs.length > 0) {
		sections.push("### Font Families")
		for (const f of typo.fontFamilyDefs) {
			sections.push(`- **${f.name}** (${f.category}): \`${f.fallbackStack}\` — ${f.usage}`)
		}
	} else if (typo.fontFamilies.length > 0) {
		sections.push("### Font Families")
		for (const f of typo.fontFamilies) {
			sections.push(`- ${f}`)
		}
	}

	if (typo.scale.length > 0) {
		sections.push("\n### Type Scale")
		sections.push(
			mdTable(
				["Name", "Font Size", "Line Height", "Font Weight", "Usage"],
				typo.scale.map((s) => [
					s.name,
					`\`${s.fontSize}\``,
					s.lineHeight ? `\`${s.lineHeight}\`` : "—",
					s.fontWeight ?? "—",
					s.usage,
				]),
			),
		)
	}

	if (typo.fontWeights.length > 0) {
		sections.push(
			`\n### Font Weights\n${mdTable(
				["Name", "Value"],
				typo.fontWeights.map((w) => [w.name, w.value]),
			)}`,
		)
	}

	if (typo.lineHeights.length > 0) {
		sections.push(
			`\n### Line Heights\n${mdTable(
				["Name", "Value"],
				typo.lineHeights.map((lh) => [lh.name, lh.value]),
			)}`,
		)
	}

	if (typo.letterSpacings && typo.letterSpacings.length > 0) {
		sections.push(
			`\n### Letter Spacings\n${mdTable(
				["Name", "Value", "Usage"],
				typo.letterSpacings.map((ls) => [ls.name, ls.value, ls.usage]),
			)}`,
		)
	}

	if (typo.responsiveScaling && typo.responsiveScaling.length > 0) {
		sections.push("\n### Responsive Font Scaling")
		for (const rs of typo.responsiveScaling) {
			sections.push(
				`- **${rs.breakpoint}**: scale factor \`${rs.scaleFactor}\` — ${rs.description}`,
			)
		}
	}

	return sections.join("\n")
}

export function buildLayoutReference(
	layout: LayoutSystem | null,
	options?: { compact?: boolean },
): string {
	if (!layout) return ""

	if (options?.compact) {
		return buildLayoutCompact(layout)
	}

	return buildLayoutFull(layout)
}

function buildLayoutCompact(layout: LayoutSystem): string {
	const sections: string[] = []
	sections.push(`\n### Layout\n**Approach**: ${layout.approach}`)

	if (layout.containers.length > 0) {
		for (const c of layout.containers) {
			const dims = formatContainerDims(c.maxWidth, c.padding)
			sections.push(`- **${c.name}**: ${dims}`)
		}
	}

	if (layout.grids.length > 0) {
		for (const g of layout.grids) {
			const details = formatGridDims(g.type, g.columns, g.gap)
			sections.push(`- Grid: ${details}`)
		}
	}

	return sections.join("\n")
}

function buildLayoutFull(layout: LayoutSystem): string {
	const sections: string[] = []

	sections.push(`### Layout Approach\n${layout.approach}`)

	if (layout.containers.length > 0) {
		sections.push("\n### Containers")
		for (const c of layout.containers) {
			const dims = formatContainerDims(c.maxWidth, c.padding)
			sections.push(`- **${c.name}**: ${dims}`)

			if (c.responsiveOverrides && c.responsiveOverrides.length > 0) {
				for (const ro of c.responsiveOverrides) {
					const overrides: string[] = []
					if (ro.maxWidth) overrides.push(`max-width: \`${ro.maxWidth}\``)
					if (ro.padding) overrides.push(`padding: \`${ro.padding}\``)
					if (ro.columns) overrides.push(`columns: ${ro.columns}`)
					if (ro.gap) overrides.push(`gap: \`${ro.gap}\``)
					sections.push(`  - @${ro.breakpoint}: ${overrides.join(", ")}`)
				}
			}
		}
	}

	if (layout.grids.length > 0) {
		sections.push("\n### Grid Systems")
		for (const g of layout.grids) {
			const details = formatGridDims(g.type, g.columns, g.gap)
			sections.push(`- ${details}`)
		}
	}

	if (layout.navigation.length > 0) {
		sections.push("\n### Navigation Patterns")
		for (const n of layout.navigation) {
			sections.push(`- **${n.type}**: ${n.description}`)
		}
	}

	if (layout.spacingRhythm && layout.spacingRhythm.length > 0) {
		sections.push("\n### Spacing Rhythm")
		for (const sr of layout.spacingRhythm) {
			sections.push(`- **${sr.name}** (\`${sr.value}\`): ${sr.usage}`)
		}
	}

	return sections.join("\n")
}

function formatContainerDims(maxWidth?: string | null, padding?: string | null): string {
	const maxW = maxWidth ? `max-width: \`${maxWidth}\`` : ""
	const pad = padding ? `padding: \`${padding}\`` : ""
	return [maxW, pad].filter(Boolean).join(", ")
}

function formatGridDims(type: string, columns?: number | null, gap?: string | null): string {
	const cols = columns ? `${columns} columns` : ""
	const gapStr = gap ? `gap: \`${gap}\`` : ""
	return [type, cols, gapStr].filter(Boolean).join(", ")
}

export function buildInteractionsReference(interactions: InteractionPatterns | null): string {
	if (!interactions) return ""

	const sections: string[] = []

	if (interactions.animations.length > 0) {
		sections.push("### Animations")
		sections.push(
			mdTable(
				["Name", "Type", "Description", "Duration", "Easing", "Trigger"],
				interactions.animations.map((a) => [
					a.name,
					a.type,
					a.description,
					a.duration ?? "—",
					a.easing ?? "—",
					a.trigger ?? "—",
				]),
			),
		)
	}

	if (interactions.transitions.length > 0) {
		sections.push("\n### Transitions")
		sections.push(
			mdTable(
				["Property", "Duration", "Easing"],
				interactions.transitions.map((t) => [t.property, t.duration, t.easing]),
			),
		)
	}

	if (interactions.gestures.length > 0) {
		sections.push("\n### Gestures")
		for (const g of interactions.gestures) {
			const trigger = g.triggerElement ? ` (on ${g.triggerElement})` : ""
			const feedback = g.feedbackType ? ` — feedback: ${g.feedbackType}` : ""
			sections.push(`- **${g.type}**${trigger}: ${g.description}${feedback}`)
		}
	}

	if (interactions.choreography && interactions.choreography.length > 0) {
		sections.push("\n### State Choreography")
		for (const ch of interactions.choreography) {
			sections.push(`\n**${ch.name}**: ${ch.description}`)
			sections.push("Steps:")
			for (let i = 0; i < ch.steps.length; i++) {
				sections.push(`${i + 1}. ${ch.steps[i]}`)
			}
		}
	}

	return sections.join("\n")
}

export function buildResponsiveReference(
	responsive: ResponsiveStrategy | null,
	tokens: DesignTokens | null,
): string {
	const sections: string[] = []

	if (responsive) {
		if (responsive.breakpoints.length > 0) {
			sections.push(buildBreakpointsReference(responsive.breakpoints))
		}

		if (responsive.patterns.length > 0) {
			sections.push("\n### Responsive Patterns")
			for (const p of responsive.patterns) {
				sections.push(`- **${p.name}** (@${p.breakpoint}): ${p.description}`)
			}
		}

		if (responsive.componentAdaptations && responsive.componentAdaptations.length > 0) {
			sections.push("\n### Component Adaptations")
			for (const ca of responsive.componentAdaptations) {
				sections.push(`- **${ca.component}** (@${ca.breakpoint}): ${ca.adaptation}`)
			}
		}

		if (responsive.layoutAdaptations && responsive.layoutAdaptations.length > 0) {
			sections.push("\n### Layout Adaptations")
			for (const la of responsive.layoutAdaptations) {
				sections.push(`- **${la.layoutElement}** (@${la.breakpoint}): ${la.behavior}`)
			}
		}
	}

	if (tokens && tokens.breakpoints.length > 0) {
		if (!responsive || responsive.breakpoints.length === 0) {
			sections.push(buildBreakpointsReference(tokens.breakpoints, "Breakpoints (from tokens)"))
		}
	}

	return sections.join("\n")
}

export function buildComponentCatalogReference(components: ComponentCatalog | null): string {
	if (!components || components.components.length === 0) return ""

	const sections: string[] = []
	sections.push("\n### Component Catalog Reference")
	sections.push(
		"The following components were identified in the source design. Use them as inspiration for component structure and naming:",
	)
	const coreComponents = components.components.filter(
		(c) => c.tier === "core" || c.tier === "design-system",
	)
	const toShow = coreComponents.length > 0 ? coreComponents : components.components.slice(0, 10)
	for (const c of toShow) {
		const variants = c.variants.length > 0 ? ` — variants: ${c.variants.join(", ")}` : ""
		sections.push(`- **${c.name}** (${c.category}): ${c.description}${variants}`)
	}
	return sections.join("\n")
}
