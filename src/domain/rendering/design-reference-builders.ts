import type {
	ComponentCatalog,
	DesignTokens,
	InteractionPatterns,
	LayoutSystem,
	ResponsiveStrategy,
	TypographySystem,
} from "@defs/analysis.js"

// ── Color Reference ──────────────────────────────────────────────

export function buildColorReference(tokens: DesignTokens | null): string {
	if (!tokens?.colorGroups || tokens.colorGroups.length === 0) return ""

	const sections: string[] = []
	sections.push("### Colors (by group)")
	for (const group of tokens.colorGroups) {
		const level = group.level ? ` (${group.level})` : ""
		sections.push(`\n**${group.group}${level}**:`)
		sections.push("| Name | Value | Usage |")
		sections.push("|------|-------|-------|")
		for (const t of group.tokens) {
			sections.push(`| ${t.name} | \`${t.value}\` | ${t.usage} |`)
		}
	}
	return sections.join("\n")
}

/**
 * Compact color reference (no "by group" subtitle) used by pages prompt.
 */
export function buildColorReferenceCompact(tokens: DesignTokens | null): string {
	if (!tokens?.colorGroups || tokens.colorGroups.length === 0) return ""

	const sections: string[] = []
	sections.push("### Colors")
	for (const group of tokens.colorGroups) {
		const level = group.level ? ` (${group.level})` : ""
		sections.push(`\n**${group.group}${level}**:`)
		sections.push("| Name | Value | Usage |")
		sections.push("|------|-------|-------|")
		for (const t of group.tokens) {
			sections.push(`| ${t.name} | \`${t.value}\` | ${t.usage} |`)
		}
	}
	return sections.join("\n")
}

// ── Spacing Reference ────────────────────────────────────────────

export function buildSpacingReference(tokens: DesignTokens | null): string {
	if (!tokens || tokens.spacing.length === 0) return ""

	const sections: string[] = []
	sections.push("\n### Spacing")
	sections.push("| Name | Value | Usage |")
	sections.push("|------|-------|-------|")
	for (const t of tokens.spacing) {
		sections.push(`| ${t.name} | \`${t.value}\` | ${t.usage} |`)
	}
	return sections.join("\n")
}

// ── Border Radius Reference ─────────────────────────────────────

export function buildBorderRadiusReference(tokens: DesignTokens | null): string {
	if (!tokens || tokens.borderRadius.length === 0) return ""

	const sections: string[] = []
	sections.push("\n### Border Radius")
	sections.push("| Name | Value |")
	sections.push("|------|-------|")
	for (const t of tokens.borderRadius) {
		sections.push(`| ${t.name} | \`${t.value}\` |`)
	}
	return sections.join("\n")
}

// ── Shadows Reference ───────────────────────────────────────────

export function buildShadowsReference(tokens: DesignTokens | null): string {
	if (!tokens || tokens.shadows.length === 0) return ""

	const sections: string[] = []
	sections.push("\n### Shadows")
	sections.push("| Name | Value |")
	sections.push("|------|-------|")
	for (const t of tokens.shadows) {
		sections.push(`| ${t.name} | \`${t.value}\` |`)
	}
	return sections.join("\n")
}

// ── Motion Tokens Reference ─────────────────────────────────────

export function buildMotionReference(tokens: DesignTokens | null): string {
	if (!tokens?.motion || tokens.motion.length === 0) return ""

	const sections: string[] = []
	sections.push("\n### Motion Tokens")
	sections.push("| Name | Duration | Easing | Usage |")
	sections.push("|------|----------|--------|-------|")
	for (const t of tokens.motion) {
		sections.push(`| ${t.name} | \`${t.duration}\` | \`${t.easing}\` | ${t.usage} |`)
	}
	return sections.join("\n")
}

// ── Breakpoints Reference ───────────────────────────────────────

export function buildBreakpointsReference(
	breakpoints: Array<{ name: string; value: string }>,
	label?: string,
): string {
	if (breakpoints.length === 0) return ""

	const sections: string[] = []
	sections.push(`\n### ${label ?? "Breakpoints"}`)
	sections.push("| Name | Value |")
	sections.push("|------|-------|")
	for (const bp of breakpoints) {
		sections.push(`| ${bp.name} | \`${bp.value}\` |`)
	}
	return sections.join("\n")
}

// ── Z-Index Reference ───────────────────────────────────────────

export function buildZIndexReference(tokens: DesignTokens | null): string {
	if (!tokens || tokens.zIndex.length === 0) return ""

	const sections: string[] = []
	sections.push("\n### Z-Index")
	sections.push("| Name | Value |")
	sections.push("|------|-------|")
	for (const t of tokens.zIndex) {
		sections.push(`| ${t.name} | \`${t.value}\` |`)
	}
	return sections.join("\n")
}

// ── Theme Variants Reference ────────────────────────────────────

export function buildThemeVariantsReference(tokens: DesignTokens | null): string {
	if (!tokens?.themeVariants || tokens.themeVariants.length === 0) return ""

	const sections: string[] = []
	sections.push("\n### Theme Variants")
	if (tokens.defaultTheme) {
		sections.push(`**Default Theme:** ${tokens.defaultTheme}`)
	}
	for (const variant of tokens.themeVariants) {
		sections.push(`\n**${variant.name}** (${variant.surfaceStrategy}):`)
		sections.push("| Token | Value | Derivation |")
		sections.push("|-------|-------|------------|")
		for (const override of variant.colorOverrides) {
			sections.push(
				`| ${override.tokenName} | \`${override.value}\` | ${override.derivation ?? "-"} |`,
			)
		}
	}
	return sections.join("\n")
}

// ── Typography Reference ────────────────────────────────────────

export function buildTypographyReference(typo: TypographySystem | null): string {
	if (!typo) return ""

	const sections: string[] = []

	// Font Families
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

	// Type Scale
	if (typo.scale.length > 0) {
		sections.push("\n### Type Scale")
		sections.push("| Name | Font Size | Line Height | Font Weight | Usage |")
		sections.push("|------|-----------|-------------|-------------|-------|")
		for (const s of typo.scale) {
			sections.push(
				`| ${s.name} | \`${s.fontSize}\` | ${s.lineHeight ? `\`${s.lineHeight}\`` : "—"} | ${s.fontWeight ?? "—"} | ${s.usage} |`,
			)
		}
	}

	// Font Weights
	if (typo.fontWeights.length > 0) {
		sections.push("\n### Font Weights")
		sections.push("| Name | Value |")
		sections.push("|------|-------|")
		for (const w of typo.fontWeights) {
			sections.push(`| ${w.name} | \`${w.value}\` |`)
		}
	}

	// Line Heights
	if (typo.lineHeights.length > 0) {
		sections.push("\n### Line Heights")
		sections.push("| Name | Value |")
		sections.push("|------|-------|")
		for (const lh of typo.lineHeights) {
			sections.push(`| ${lh.name} | \`${lh.value}\` |`)
		}
	}

	// Letter Spacings
	if (typo.letterSpacings && typo.letterSpacings.length > 0) {
		sections.push("\n### Letter Spacings")
		sections.push("| Name | Value | Usage |")
		sections.push("|------|-------|-------|")
		for (const ls of typo.letterSpacings) {
			sections.push(`| ${ls.name} | \`${ls.value}\` | ${ls.usage} |`)
		}
	}

	// Responsive Scaling
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

// ── Layout Reference ────────────────────────────────────────────

export function buildLayoutReference(layout: LayoutSystem | null): string {
	if (!layout) return ""

	const sections: string[] = []

	// Layout Approach
	sections.push(`### Layout Approach\n${layout.approach}`)

	// Containers
	if (layout.containers.length > 0) {
		sections.push("\n### Containers")
		for (const c of layout.containers) {
			const maxW = c.maxWidth ? `max-width: \`${c.maxWidth}\`` : ""
			const pad = c.padding ? `padding: \`${c.padding}\`` : ""
			const dims = [maxW, pad].filter(Boolean).join(", ")
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

	// Grids
	if (layout.grids.length > 0) {
		sections.push("\n### Grid Systems")
		for (const g of layout.grids) {
			const cols = g.columns ? `${g.columns} columns` : ""
			const gap = g.gap ? `gap: \`${g.gap}\`` : ""
			const details = [g.type, cols, gap].filter(Boolean).join(", ")
			sections.push(`- ${details}`)
		}
	}

	// Navigation
	if (layout.navigation.length > 0) {
		sections.push("\n### Navigation Patterns")
		for (const n of layout.navigation) {
			sections.push(`- **${n.type}**: ${n.description}`)
		}
	}

	// Spacing Rhythm
	if (layout.spacingRhythm && layout.spacingRhythm.length > 0) {
		sections.push("\n### Spacing Rhythm")
		for (const sr of layout.spacingRhythm) {
			sections.push(`- **${sr.name}** (\`${sr.value}\`): ${sr.usage}`)
		}
	}

	return sections.join("\n")
}

/**
 * Compact layout reference (no subtitles for Containers/Grid Systems) used by pages prompt.
 */
export function buildLayoutReferenceCompact(layout: LayoutSystem | null): string {
	if (!layout) return ""

	const sections: string[] = []

	sections.push(`\n### Layout\n**Approach**: ${layout.approach}`)

	if (layout.containers.length > 0) {
		for (const c of layout.containers) {
			const maxW = c.maxWidth ? `max-width: \`${c.maxWidth}\`` : ""
			const pad = c.padding ? `padding: \`${c.padding}\`` : ""
			const dims = [maxW, pad].filter(Boolean).join(", ")
			sections.push(`- **${c.name}**: ${dims}`)
		}
	}

	if (layout.grids.length > 0) {
		for (const g of layout.grids) {
			const cols = g.columns ? `${g.columns} columns` : ""
			const gap = g.gap ? `gap: \`${g.gap}\`` : ""
			const details = [g.type, cols, gap].filter(Boolean).join(", ")
			sections.push(`- Grid: ${details}`)
		}
	}

	return sections.join("\n")
}

// ── Interactions Reference ──────────────────────────────────────

export function buildInteractionsReference(interactions: InteractionPatterns | null): string {
	if (!interactions) return ""

	const sections: string[] = []

	// Animations
	if (interactions.animations.length > 0) {
		sections.push("### Animations")
		sections.push("| Name | Type | Description | Duration | Easing | Trigger |")
		sections.push("|------|------|-------------|----------|--------|---------|")
		for (const a of interactions.animations) {
			sections.push(
				`| ${a.name} | ${a.type} | ${a.description} | ${a.duration ?? "—"} | ${a.easing ?? "—"} | ${a.trigger ?? "—"} |`,
			)
		}
	}

	// Transitions
	if (interactions.transitions.length > 0) {
		sections.push("\n### Transitions")
		sections.push("| Property | Duration | Easing |")
		sections.push("|----------|----------|--------|")
		for (const t of interactions.transitions) {
			sections.push(`| ${t.property} | \`${t.duration}\` | \`${t.easing}\` |`)
		}
	}

	// Gestures
	if (interactions.gestures.length > 0) {
		sections.push("\n### Gestures")
		for (const g of interactions.gestures) {
			const trigger = g.triggerElement ? ` (on ${g.triggerElement})` : ""
			const feedback = g.feedbackType ? ` — feedback: ${g.feedbackType}` : ""
			sections.push(`- **${g.type}**${trigger}: ${g.description}${feedback}`)
		}
	}

	// Choreography
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

// ── Responsive Reference ────────────────────────────────────────

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

	// Token breakpoints as fallback/supplement
	if (tokens && tokens.breakpoints.length > 0) {
		if (!responsive || responsive.breakpoints.length === 0) {
			sections.push(buildBreakpointsReference(tokens.breakpoints, "Breakpoints (from tokens)"))
		}
	}

	return sections.join("\n")
}

// ── Component Catalog Reference ─────────────────────────────────

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
