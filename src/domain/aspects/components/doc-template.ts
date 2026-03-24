import type { ComponentInfo } from "@defs/analysis.js"
import type { TemplateContext } from "@defs/templates.js"
import { renderConsistency } from "@domain/rendering/format-utils.js"

function renderComponent(comp: ComponentInfo): string {
	const lines: string[] = []
	lines.push(`### ${comp.name}\n`)
	lines.push(`- **Category:** ${comp.category}`)
	lines.push(`- **Description:** ${comp.description}`)

	// Variants
	if (comp.variantSpecs && comp.variantSpecs.length > 0) {
		lines.push("\n**Variants:**")
		for (const v of comp.variantSpecs) {
			const diff = v.visualDiff ? ` — ${v.visualDiff}` : ""
			lines.push(`- **${v.name}:** ${v.description}${diff}`)
		}
	} else if (comp.variants.length > 0) {
		lines.push(`\n**Variants:** ${comp.variants.join(", ")}`)
	}

	// States
	if (comp.states && comp.states.length > 0) {
		lines.push("\n**States:**")
		for (const s of comp.states) {
			lines.push(`- **${s.name}:** ${s.description}`)
		}
	}

	// Sizes
	if (comp.sizes && comp.sizes.length > 0) {
		lines.push(`\n**Sizes:** ${comp.sizes.join(", ")}`)
	}

	// Accessibility
	if (comp.accessibility) {
		lines.push("\n**Accessibility:**")
		if (comp.accessibility.role) {
			lines.push(`- **Role:** ${comp.accessibility.role}`)
		}
		if (comp.accessibility.keyboardInteraction) {
			lines.push(`- **Keyboard:** ${comp.accessibility.keyboardInteraction}`)
		}
		if (comp.accessibility.screenReaderNotes) {
			lines.push(`- **Screen Reader:** ${comp.accessibility.screenReaderNotes}`)
		}
	}

	lines.push("")
	return lines.join("\n")
}

export function renderComponentsDoc(ctx: TemplateContext): string | null {
	const catalog = ctx.analysis.componentCatalog
	if (!catalog) return null
	if (catalog.components.length === 0) return null

	const lines: string[] = []
	lines.push("# Component Catalog\n")

	// Overview
	const core = catalog.components.filter((c) => c.tier === "core")
	const designSystem = catalog.components.filter((c) => c.tier === "design-system")
	const domain = catalog.components.filter((c) => c.tier === "domain")

	lines.push("## Overview\n")
	lines.push(`- **Total:** ${catalog.components.length} components`)
	lines.push(`- **Core:** ${core.length}`)
	lines.push(`- **Design System:** ${designSystem.length}`)
	lines.push(`- **Domain:** ${domain.length}`)
	lines.push("")

	// Core Components
	if (core.length > 0) {
		lines.push("## Core Components\n")
		for (const c of core) {
			lines.push(renderComponent(c))
		}
	}

	// Design System Components
	if (designSystem.length > 0) {
		lines.push("## Design System Components\n")
		for (const c of designSystem) {
			lines.push(renderComponent(c))
		}
	}

	// Domain Components
	if (domain.length > 0) {
		lines.push("## Domain Components\n")
		for (const c of domain) {
			lines.push(renderComponent(c))
		}
	}

	// Composition Patterns
	if (catalog.patterns.length > 0) {
		lines.push("## Composition Patterns\n")
		for (const p of catalog.patterns) {
			lines.push(`### ${p.name}\n`)
			lines.push(p.description)
			lines.push(`\n**Components:** ${p.components.join(", ")}`)
			lines.push("")
		}
	}

	// Consistency Assessment
	if (catalog.consistency) {
		lines.push(renderConsistency(catalog.consistency))
		lines.push("")
	}

	return lines.join("\n")
}
