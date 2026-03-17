import type { PromptTemplateContext } from "@defs/templates.js"
import { buildEnvironmentSection } from "@pipeline/assembly/resolve-environment.js"
import { buildFileStructureGuide } from "@pipeline/assembly/resolve-structure.js"
import { buildArtifactsSection, buildContractSection } from "@pipeline/assembly/step-contracts.js"

export function renderSetupPrompt(ctx: PromptTemplateContext): string {
	const { analysis, env, structure, stepNumber, dependencies, stepTitles } = ctx
	const { essence } = analysis

	const prerequisitesText = buildContractSection("setup", dependencies, stepTitles)

	const tokenCategories = analysis.designTokens
		? [
				analysis.designTokens.colors.length > 0 && "Colors",
				analysis.designTokens.spacing.length > 0 && "Spacing",
				analysis.designTokens.borderRadius.length > 0 && "Border Radius",
				analysis.designTokens.shadows.length > 0 && "Shadows",
				analysis.designTokens.breakpoints.length > 0 && "Breakpoints",
				analysis.designTokens.zIndex.length > 0 && "Z-Index",
				analysis.designTokens.motion && analysis.designTokens.motion.length > 0 && "Motion",
			]
				.filter(Boolean)
				.join(", ")
		: "Colors, Spacing, Border Radius, Shadows"

	const instructions =
		env.mode === "existing-project"
			? buildExistingProjectInstructions(env)
			: buildGreenfieldInstructions()

	return `# Step ${stepNumber}: Project Setup

## Goal
Set up the project with design system infrastructure — token definitions, global styles, font loading, and component directories.

## Prerequisites
${prerequisitesText}

## Context
**Design Essence**: ${essence.summary}

**Design Philosophy**: ${essence.designPhilosophy}

**Key Characteristics**:
${essence.keyCharacteristics.map((c) => `- ${c}`).join("\n")}

**Token Categories to Support**: ${tokenCategories}

${buildEnvironmentSection(env)}

## Instructions
${instructions}

${buildFileStructureGuide("setup", structure)}

## Design Reference
**Essence Strategies**:
- **Color Strategy**: ${essence.colorStrategy}
- **Typography Strategy**: ${essence.typographyStrategy}
- **Layout Strategy**: ${essence.layoutStrategy}
- **Component Strategy**: ${essence.componentStrategy}
- **Interaction Strategy**: ${essence.interactionStrategy}

## Expected Outcome
The project is bootstrapped with all infrastructure needed for subsequent design system steps. Token file exists (empty or with placeholder structure), global styles are loaded, fonts are configured, and component directories are created.

${buildArtifactsSection("setup")}

## Validation
- Project builds and runs without errors
- Token file exists and is importable
- Global styles are applied (CSS reset, body defaults)
- Fonts load correctly
- Component directories exist (layout/, ui/)
`
}

function buildExistingProjectInstructions(
	env: import("@pipeline/assembly/resolve-environment.js").EnvironmentProfile,
): string {
	return `This is an **existing ${env.framework} project** with ${env.styling}. Integrate into the existing environment — do NOT create a new project or install a different framework.

1. **Design token infrastructure** — ${env.tokenStrategy}
2. **Global styles** — Set up base styles (CSS reset, body defaults, selection styles) using ${env.styling} conventions
3. **Folder structure** — Add design system folders that fit the existing project structure (tokens/, styles/, components/)
4. **Font loading** — Configure font loading for the design system's font families
5. **Configuration updates** — Update ${env.styling} configuration if needed (e.g., extend Tailwind theme, add SCSS variables file)
${env.uiLibrary ? `6. **UI Library integration** — Align design tokens with ${env.uiLibrary} theming API` : ""}

**Do NOT**:
- Create a new project or run scaffolding commands
- Install a different framework, build tool, or styling library
- Restructure existing project files unrelated to the design system`
}

function buildGreenfieldInstructions(): string {
	return `This is a **new project**. The agent will choose the tech stack. Set up the project with:

1. **Project scaffolding** — Create a new frontend project with a modern framework and build tool
2. **Design token infrastructure** — Set up a token definition file (CSS custom properties, theme object, or framework-specific approach)
3. **Global styles** — Base styles (CSS reset, body defaults, selection styles)
4. **Font loading** — Configure font loading for the design system's font families
5. **Folder structure** — Create component directories (layout/, ui/) and style directories
6. **Utility setup** — Add a className merge utility if applicable`
}
