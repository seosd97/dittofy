import type { PromptTemplateContext } from "@defs/templates.js"
import { buildInteractionsReference } from "@pipeline/assembly/design-reference-builders.js"
import { buildEnvironmentSection } from "@pipeline/assembly/resolve-environment.js"
import { buildFileStructureGuide } from "@pipeline/assembly/resolve-structure.js"
import { buildArtifactsSection, buildContractSection } from "@pipeline/assembly/step-contracts.js"

export function renderInteractionsPrompt(ctx: PromptTemplateContext): string {
	const { analysis, env, structure, stepNumber, dependencies, stepTitles } = ctx
	const { essence, interactionPatterns } = analysis

	const prerequisitesText = buildContractSection("interactions", dependencies, stepTitles)

	return `# Step ${stepNumber}: Interactions & Animations

## Goal
Add hover/active/focus states, animations, and transitions to the showcase pages and design system elements. Describe the visual behavior (duration, easing, trigger, what changes) for each interaction.

## Prerequisites
${prerequisitesText}

## Context
**Interaction Strategy**: ${essence.interactionStrategy}

${buildEnvironmentSection(env)}

## Instructions
1. **Button states** — hover, active, focus, and disabled states with appropriate visual feedback
2. **Card hover effects** — subtle lift, shadow change, or scale on hover
3. **Link transitions** — color/underline transitions on hover and focus
4. **Page entrance animations** — fade-in, slide-up, or other entrance effects for page sections
5. **Scroll-based effects** — reveal animations on scroll if applicable
6. **Navigation interactions** — mobile menu open/close transitions, active state indicators
7. **Focus management** — visible focus indicators for keyboard navigation (accessibility)

Apply interactions to:
- Home and About showcase pages (page entrance animations, scroll effects, section transitions)
- Design system elements (button hover/active states, link transitions, card hover effects)

${buildFileStructureGuide("interactions", structure)}

## Design Reference
${buildInteractionsDesignReference(interactionPatterns)}

## Expected Outcome
All interactive elements have appropriate state changes with smooth transitions. Pages have entrance animations. Navigation has open/close transitions. Focus states are visible for accessibility.

${buildArtifactsSection("interactions")}

## Validation
- Buttons respond to hover, active, and focus with visual feedback
- Cards have hover effects (shadow, scale, or other)
- Page sections animate in on load or scroll
- Navigation transitions are smooth (mobile menu open/close)
- Focus indicators are visible for keyboard navigation
- Transition durations feel natural (not too fast, not too slow)
- Animations respect prefers-reduced-motion
`
}

function buildInteractionsDesignReference(
	interactions: import("@defs/analysis.js").InteractionPatterns | null,
): string {
	if (!interactions) {
		return "*No interaction data was extracted from analysis. Implement sensible defaults: 150ms for hover transitions, 300ms for page animations, ease-out easing.*"
	}

	const result = buildInteractionsReference(interactions)

	return result.length > 0
		? result
		: "*No interaction patterns extracted. Implement sensible defaults: 150ms for hover transitions, 300ms for page animations, ease-out easing.*"
}
