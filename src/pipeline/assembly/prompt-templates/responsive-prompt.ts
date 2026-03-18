import type { PromptTemplateContext } from "@defs/templates.js"
import { buildEnvironmentSection } from "@pipeline/assembly/resolve-environment.js"
import { buildFileStructureGuide } from "@pipeline/assembly/resolve-structure.js"
import { buildArtifactsSection, buildContractSection } from "@pipeline/assembly/step-contracts.js"

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
**Responsive Strategy**: ${responsiveStrategy?.approach?.value ?? essence.layoutStrategy}

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
${buildResponsiveReference(responsiveStrategy, designTokens)}

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

function buildResponsiveReference(
	responsive: import("@defs/analysis.js").ResponsiveStrategy | null,
	tokens: import("@defs/analysis.js").DesignTokens | null,
): string {
	const sections: string[] = []

	// Breakpoints from responsive strategy
	if (responsive) {
		if (responsive.breakpoints.length > 0) {
			sections.push("### Breakpoints")
			sections.push("| Name | Value |")
			sections.push("|------|-------|")
			for (const bp of responsive.breakpoints) {
				sections.push(`| ${bp.name} | \`${bp.value}\` |`)
			}
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
			sections.push("### Breakpoints (from tokens)")
			sections.push("| Name | Value |")
			sections.push("|------|-------|")
			for (const bp of tokens.breakpoints) {
				sections.push(`| ${bp.name} | \`${bp.value}\` |`)
			}
		}
	}

	return sections.length > 0
		? sections.join("\n")
		: "*No responsive data was extracted from analysis. Implement standard mobile-first responsive breakpoints (640px, 768px, 1024px, 1280px).*"
}
