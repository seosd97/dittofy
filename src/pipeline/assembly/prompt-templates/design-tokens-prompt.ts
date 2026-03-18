import type { PromptTemplateContext } from "@defs/templates.js"
import { buildEnvironmentSection } from "@pipeline/assembly/resolve-environment.js"
import { buildFileStructureGuide } from "@pipeline/assembly/resolve-structure.js"
import { buildArtifactsSection, buildContractSection } from "@pipeline/assembly/step-contracts.js"

export function renderDesignTokensPrompt(ctx: PromptTemplateContext): string {
	const { analysis, env, structure, stepNumber, dependencies, stepTitles } = ctx
	const { essence, designTokens } = analysis

	const prerequisitesText = buildContractSection("design-tokens", dependencies, stepTitles)

	return `# Step ${stepNumber}: Design Tokens

## Goal
Define all design tokens — the foundational visual values of the design system. This includes colors, spacing, border radius, shadows, z-index, breakpoints, and motion tokens. Do NOT include typography (that is a separate step).

## Prerequisites
${prerequisitesText}

## Context
**Design Essence**: ${essence.summary}

**Color Strategy**: ${essence.colorStrategy}

**Design Philosophy**: ${essence.designPhilosophy}

${buildEnvironmentSection(env)}

**Token Implementation Approach**: ${env.tokenStrategy}

## Instructions
Implement all token categories with the exact values from the design reference below. Use semantic naming conventions (e.g., textPrimary, surfaceSecondary, borderSubtle — not color-1, color-2).

1. Define all color tokens organized by semantic groups
2. Define the complete spacing scale
3. Define border radius tiers
4. Define shadow/elevation levels
5. Define z-index scale (if relevant)
6. Define breakpoint values for responsive design
7. Define transition/animation tokens (durations, easing functions)
8. Set up global base styles (CSS reset approach, body defaults, selection styles, scrollbar styling)
9. Update styling configuration if applicable (e.g., Tailwind theme.extend)

Use exact values from the analysis without alteration.

${buildFileStructureGuide("design-tokens", structure)}

## Design Reference
${buildDesignReference(designTokens)}

## Expected Outcome
All design tokens are defined in the token file with semantic names. The styling configuration (if applicable) extends the theme with these values. Global base styles apply the tokens.

${buildArtifactsSection("design-tokens")}

## Validation
- All token categories are defined with exact values from the design reference
- Token names follow semantic naming conventions
- Tokens are importable and usable throughout the project
- Styling config is updated if applicable (e.g., Tailwind theme.extend)
- Global base styles reference the tokens correctly
`
}

function buildDesignReference(tokens: import("@defs/analysis.js").DesignTokens | null): string {
	if (!tokens) {
		return "*No design tokens were extracted from analysis. Define reasonable defaults based on the design essence.*"
	}

	const sections: string[] = []

	// Colors
	if (tokens.colorGroups && tokens.colorGroups.length > 0) {
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
	} else if (tokens.colors.length > 0) {
		sections.push("### Colors")
		sections.push("| Name | Value | Usage |")
		sections.push("|------|-------|-------|")
		for (const t of tokens.colors) {
			sections.push(`| ${t.name} | \`${t.value}\` | ${t.usage} |`)
		}
	}

	// Spacing
	if (tokens.spacing.length > 0) {
		sections.push("\n### Spacing")
		sections.push("| Name | Value | Usage |")
		sections.push("|------|-------|-------|")
		for (const t of tokens.spacing) {
			sections.push(`| ${t.name} | \`${t.value}\` | ${t.usage} |`)
		}
	}

	// Border Radius
	if (tokens.borderRadius.length > 0) {
		sections.push("\n### Border Radius")
		sections.push("| Name | Value |")
		sections.push("|------|-------|")
		for (const t of tokens.borderRadius) {
			sections.push(`| ${t.name} | \`${t.value}\` |`)
		}
	}

	// Shadows
	if (tokens.shadows.length > 0) {
		sections.push("\n### Shadows")
		sections.push("| Name | Value |")
		sections.push("|------|-------|")
		for (const t of tokens.shadows) {
			sections.push(`| ${t.name} | \`${t.value}\` |`)
		}
	}

	// Motion
	if (tokens.motion && tokens.motion.length > 0) {
		sections.push("\n### Motion Tokens")
		sections.push("| Name | Duration | Easing | Usage |")
		sections.push("|------|----------|--------|-------|")
		for (const t of tokens.motion) {
			sections.push(`| ${t.name} | \`${t.duration}\` | \`${t.easing}\` | ${t.usage} |`)
		}
	}

	// Breakpoints
	if (tokens.breakpoints.length > 0) {
		sections.push("\n### Breakpoints")
		sections.push("| Name | Value |")
		sections.push("|------|-------|")
		for (const t of tokens.breakpoints) {
			sections.push(`| ${t.name} | \`${t.value}\` |`)
		}
	}

	// Z-Index
	if (tokens.zIndex.length > 0) {
		sections.push("\n### Z-Index")
		sections.push("| Name | Value |")
		sections.push("|------|-------|")
		for (const t of tokens.zIndex) {
			sections.push(`| ${t.name} | \`${t.value}\` |`)
		}
	}

	return sections.length > 0
		? sections.join("\n")
		: "*No token values extracted. Define reasonable defaults based on the design essence.*"
}
