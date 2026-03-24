import type { PromptTemplateContext } from "@defs/templates.js"
import { buildResponsiveReference } from "@domain/rendering/design-reference-builders.js"
import { buildEnvironmentSection } from "@domain/rendering/resolve-environment.js"
import { buildFileStructureGuide } from "@domain/rendering/resolve-structure.js"
import { buildArtifactsSection, buildContractSection } from "@domain/rendering/step-contracts.js"

export function renderResponsivePrompt(ctx: PromptTemplateContext): string {
	const { analysis, env, structure, stepNumber, dependencies, stepTitles } = ctx
	const { essence, responsiveStrategy, designTokens } = analysis

	const prerequisitesText = buildContractSection("responsive", dependencies, stepTitles)

	return `# Step ${stepNumber}: Responsive Design

## Goal
Make the design responsive across all breakpoints. Apply responsive behavior to the layout shell, showcase pages (Home, About), and design system elements (responsive typography, spacing adjustments).

## Prerequisites
${prerequisitesText}

## Context
**Responsive Strategy**: ${responsiveStrategy?.approach ?? essence.layoutStrategy}

${buildEnvironmentSection(env)}

## Instructions
1. Apply responsive breakpoints to the layout shell (Header, Navigation, PageContainer, Footer)
2. Make the Home and About pages responsive at each breakpoint
3. Implement responsive typography scaling if applicable
4. Add mobile navigation behavior (hamburger menu, slide-out, etc.)
5. Adjust spacing and grid layouts at each breakpoint
6. Ensure all content is readable and accessible at every viewport size

Describe what the user sees at each breakpoint and how layout, typography, and spacing adapt.

${buildFileStructureGuide("responsive", structure)}

## Design Reference
${buildResponsiveDesignReference(responsiveStrategy, designTokens)}

## Expected Outcome
All pages and components respond correctly to viewport changes. Layout adapts from mobile to desktop with appropriate breakpoints. Navigation has a mobile-friendly pattern. Typography and spacing scale appropriately.

${buildArtifactsSection("responsive")}

## Validation
- Pages render correctly at mobile (< 640px), tablet (640-1024px), and desktop (> 1024px) viewports
- Navigation collapses to a mobile pattern on small screens
- Typography scales appropriately across breakpoints
- No horizontal overflow at any viewport size
- Content remains readable and accessible at every breakpoint
`
}

function buildResponsiveDesignReference(
	responsive: import("@defs/analysis.js").ResponsiveStrategy | null,
	tokens: import("@defs/analysis.js").DesignTokens | null,
): string {
	const result = buildResponsiveReference(responsive, tokens)

	return result.length > 0
		? result
		: "*No responsive data was extracted from analysis. Implement standard mobile-first responsive breakpoints (640px, 768px, 1024px, 1280px).*"
}
