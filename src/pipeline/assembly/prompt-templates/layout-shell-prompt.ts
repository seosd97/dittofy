import type { PromptTemplateContext } from "@defs/templates.js"
import { buildEnvironmentSection } from "@pipeline/assembly/resolve-environment.js"
import { buildFileStructureGuide } from "@pipeline/assembly/resolve-structure.js"
import { buildArtifactsSection, buildContractSection } from "@pipeline/assembly/step-contracts.js"

export function renderLayoutShellPrompt(ctx: PromptTemplateContext): string {
	const { analysis, env, structure, stepNumber, dependencies, stepTitles } = ctx
	const { essence, layoutSystem } = analysis

	const prerequisitesText = buildContractSection("layout-shell", dependencies, stepTitles)

	return `# Step ${stepNumber}: Layout Shell

## Goal
Create the structural layout shell — Header, Footer, Navigation, and PageContainer components. This is the skeleton that all pages will be placed into. Focus on structure and dimensions, NOT page content or interactive behavior.

## Prerequisites
${prerequisitesText}

## Context
**Layout Strategy**: ${essence.layoutStrategy}

${buildEnvironmentSection(env)}

## Instructions
1. **PageContainer** — Max-width, padding, centering strategy for page content
2. **Header** — Site header with correct dimensions and positioning
3. **Footer** — Site footer with correct dimensions and positioning
4. **Navigation** — Navigation structure (sidebar, top-nav, or other pattern — just the skeleton, not nav items)
5. **Root layout** — Update the root layout file to integrate header + footer + page container shell

**What NOT to build**:
- Actual page content (that comes in a later step)
- Specific navigation links or menu items
- Interactive behavior (that comes in a later step)

${buildFileStructureGuide("layout-shell", structure)}

## Design Reference
${buildLayoutReference(layoutSystem)}

## Expected Outcome
The layout shell is in place. The root layout renders Header, PageContainer (with a content slot), and Footer. Individual pages can be slotted into the PageContainer.

${buildArtifactsSection("layout-shell")}

## Validation
- Root layout renders the header, page container, and footer
- PageContainer constrains content width and applies correct padding
- Header and Footer have correct dimensions and positioning
- Layout components use design tokens for spacing and colors
- The page content slot is functional (pages render inside the shell)
`
}

function buildLayoutReference(layout: import("@defs/analysis.js").LayoutSystem | null): string {
	if (!layout) {
		return "*No layout data was extracted from analysis. Define a reasonable layout shell based on the design essence.*"
	}

	const sections: string[] = []

	// Layout Approach
	sections.push(`### Layout Approach\n${layout.approach.value}`)

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
