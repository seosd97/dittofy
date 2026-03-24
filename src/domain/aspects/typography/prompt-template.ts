import type { PromptTemplateContext } from "@defs/templates.js"
import { buildTypographyReference } from "@domain/rendering/design-reference-builders.js"
import { buildEnvironmentSection } from "@domain/rendering/resolve-environment.js"
import { buildFileStructureGuide } from "@domain/rendering/resolve-structure.js"
import { buildArtifactsSection, buildContractSection } from "@domain/rendering/step-contracts.js"

export function renderTypographyPrompt(ctx: PromptTemplateContext): string {
	const { analysis, env, structure, stepNumber, dependencies, stepTitles } = ctx
	const { essence, typography } = analysis

	const prerequisitesText = buildContractSection("typography", dependencies, stepTitles)

	return `# Step ${stepNumber}: Typography System

## Goal
Implement the complete typography system — font families, type scale, font weights, line heights, letter spacings, and typographic rhythm. This builds on the design tokens defined in the previous step.

## Prerequisites
${prerequisitesText}

## Context
**Typography Strategy**: ${essence.typographyStrategy}

${buildEnvironmentSection(env)}

## Instructions
1. Define font family declarations (primary, secondary, monospace) with full fallback stacks
2. Implement the complete type scale with font-size, line-height, font-weight, and usage context
3. Define font weight scale with semantic names
4. Define line height scale
5. Define letter spacing values (if applicable)
6. Establish typographic rhythm rules — how headings relate to body text, hierarchy principles
7. Update the token file and styling config with typography values

${buildFileStructureGuide("typography", structure)}

## Design Reference
${buildTypoDesignReference(typography)}

## Expected Outcome
The typography system is fully defined in the token file. Font families are loaded, the type scale covers all use cases (headings, body, caption, etc.), and typographic rhythm is established.

${buildArtifactsSection("typography")}

## Validation
- Font families load correctly with proper fallback stacks
- All type scale entries are defined with correct sizes, weights, and line heights
- Typography tokens are usable in components
- Heading hierarchy is visually clear and consistent
- Styling config is updated if applicable
`
}

function buildTypoDesignReference(
	typo: import("@defs/analysis.js").TypographySystem | null,
): string {
	if (!typo) {
		return "*No typography data was extracted from analysis. Define reasonable defaults based on the design essence.*"
	}

	const result = buildTypographyReference(typo)

	return result.length > 0
		? result
		: "*No typography values extracted. Define reasonable defaults based on the design essence.*"
}
