import type { PromptTemplateContext } from "@defs/templates.js"
import { buildLayoutReference } from "@domain/rendering/design-reference-builders.js"
import { buildEnvironmentSection } from "@domain/rendering/resolve-environment.js"
import { buildFileStructureGuide } from "@domain/rendering/resolve-structure.js"
import { buildArtifactsSection, buildContractSection } from "@domain/rendering/step-contracts.js"

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
${buildLayoutDesignReference(layoutSystem)}

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

function buildLayoutDesignReference(
	layout: import("@defs/analysis.js").LayoutSystem | null,
): string {
	if (!layout) {
		return "*No layout data was extracted from analysis. Define a reasonable layout shell based on the design essence.*"
	}

	return buildLayoutReference(layout)
}
