import type { PromptTemplateContext } from "@defs/templates.js"
import { buildEnvironmentSection } from "@pipeline/assembly/resolve-environment.js"
import { buildFileStructureGuide } from "@pipeline/assembly/resolve-structure.js"
import { buildArtifactsSection, buildContractSection } from "@pipeline/assembly/step-contracts.js"

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
${buildTypographyReference(typography)}

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

function buildTypographyReference(
	typo: import("@defs/analysis.js").TypographySystem | null,
): string {
	if (!typo) {
		return "*No typography data was extracted from analysis. Define reasonable defaults based on the design essence.*"
	}

	const sections: string[] = []

	// Font Families
	if (typo.fontFamilyDefs && typo.fontFamilyDefs.length > 0) {
		sections.push("### Font Families")
		for (const f of typo.fontFamilyDefs) {
			sections.push(`- **${f.name}** (${f.category}): \`${f.fallbackStack}\` — ${f.usage}`)
		}
	} else if (typo.fontFamilies.value.length > 0) {
		sections.push("### Font Families")
		for (const f of typo.fontFamilies.value) {
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

	return sections.length > 0
		? sections.join("\n")
		: "*No typography values extracted. Define reasonable defaults based on the design essence.*"
}
