import type { PromptTemplateContext } from "@defs/templates.js"
import {
	buildBorderRadiusReference,
	buildColorReferenceCompact,
	buildComponentCatalogReference,
	buildLayoutReferenceCompact,
	buildShadowsReference,
	buildSpacingReference,
	buildTypographyReference,
} from "@pipeline/assembly/design-reference-builders.js"
import { buildEnvironmentSection } from "@pipeline/assembly/resolve-environment.js"
import { buildFileStructureGuide } from "@pipeline/assembly/resolve-structure.js"
import { buildArtifactsSection, buildContractSection } from "@pipeline/assembly/step-contracts.js"

export function renderShowcasePagesPrompt(ctx: PromptTemplateContext): string {
	const { analysis, env, structure, stepNumber, dependencies, stepTitles } = ctx
	const { essence, designTokens, typography, layoutSystem, componentCatalog } = analysis

	const prerequisitesText = buildContractSection("showcase-pages", dependencies, stepTitles)

	const appType = essence.appType ?? "marketing"

	const pageInstructions =
		appType === "dashboard"
			? `### Dashboard Page (/)
A dashboard/overview page that:
- Uses the typography scale for a clear information hierarchy
- Showcases data visualization patterns with cards, stats, and lists
- Includes simple interactive elements (buttons, tabs, filters) styled with design tokens
- Applies the grid system for multi-column dashboard layout

### Settings Page (/settings)
A settings/configuration page that:
- Uses form elements and input patterns
- Demonstrates sectioning with cards and grouped controls
- Shows content patterns (form groups, toggle sections) with proper spacing
- Applies the layout system for a clean settings interface`
			: `### Home Page (/)
A landing/showcase page that:
- Uses the typography scale for a compelling hero section
- Showcases the color palette and spacing rhythm through sections with varying backgrounds
- Includes simple interactive elements (buttons, links) styled with design tokens
- Applies the layout system (grid, container strategy, visual hierarchy)

### About Page (/about)
An informational page that:
- Uses the typography hierarchy for content-heavy layout
- Demonstrates sectioning with different background colors/surfaces from the token palette
- Shows content patterns (text blocks, lists, cards) with proper spacing rhythm
- Applies shadows, border-radius, and border tokens in context`

	return `# Step ${stepNumber}: Showcase Pages

## Goal
Create two showcase pages with core UI components (Button, Card, Section) that demonstrate the design system in action. These pages are NOT replicas of the source — they showcase the extracted design tokens, typography, and layout patterns with generic content.

## Prerequisites
${prerequisitesText}

## Context
**Design Essence**: ${essence.summary}

**Design Philosophy**: ${essence.designPhilosophy}

**Key Characteristics**:
${essence.keyCharacteristics.map((c) => `- ${c}`).join("\n")}

**Strategies**:
- **Color**: ${essence.colorStrategy}
- **Typography**: ${essence.typographyStrategy}
- **Layout**: ${essence.layoutStrategy}
- **Component**: ${essence.componentStrategy}
- **Interaction**: ${essence.interactionStrategy}

${buildEnvironmentSection(env)}

## Instructions
${pageInstructions}

### Core Components
Create small, focused components in the ui/ directory:
- **Button** — Primary and secondary variants, styled with design tokens
- **Card** — Content container with shadow, radius, and padding from tokens
- **Section** — Page section container with background color and spacing

No pre-built component library exists. Create simple inline elements or small utility components as needed.

${buildFileStructureGuide("showcase-pages", structure)}

## Design Reference
${buildFullDesignReference(designTokens, typography, layoutSystem, componentCatalog)}

## Expected Outcome
Two showcase pages render inside the layout shell, demonstrating the full design system: colors, spacing, typography, shadows, border-radius, and layout patterns. Core UI components (Button, Card, Section) exist and are reusable.

${buildArtifactsSection("showcase-pages")}

## Validation
- Home page renders with hero, feature sections, and CTA
- About page renders with content sections demonstrating typography and spacing
- Both pages use design tokens consistently (no hardcoded values)
- Button, Card, and Section components exist in the ui/ directory
- Pages render correctly inside the layout shell
- Visual hierarchy matches the design essence
`
}

function buildFullDesignReference(
	tokens: import("@defs/analysis.js").DesignTokens | null,
	typo: import("@defs/analysis.js").TypographySystem | null,
	layout: import("@defs/analysis.js").LayoutSystem | null,
	components: import("@defs/analysis.js").ComponentCatalog | null,
): string {
	const parts = [
		tokens ? buildColorReferenceCompact(tokens) : "",
		tokens ? buildSpacingReference(tokens) : "",
		tokens ? buildBorderRadiusReference(tokens) : "",
		tokens ? buildShadowsReference(tokens) : "",
		buildTypographyReference(typo),
		buildLayoutReferenceCompact(layout),
		buildComponentCatalogReference(components),
	].filter(Boolean)

	return parts.length > 0
		? parts.join("\n")
		: "*No design data extracted. Create showcase pages with reasonable defaults that match the design essence.*"
}
