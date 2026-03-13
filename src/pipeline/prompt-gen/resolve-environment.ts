import type { TechStack } from "@defs/analysis.js"
import { logger } from "@utils/logger.js"

export interface EnvironmentProfile {
	/** Whether the target is an existing project or a new one */
	mode: "existing-project" | "greenfield"
	/** Detected or chosen framework (e.g., "Next.js", "React", "Vue") */
	framework: string
	/** Programming language */
	language: string
	/** Styling approach (e.g., "Tailwind CSS", "CSS Modules", "Styled Components") */
	styling: string
	/** Build tool (e.g., "Vite", "Webpack") */
	buildTool: string | null
	/** UI component library if any (e.g., "shadcn/ui", "Material UI") */
	uiLibrary: string | null
	/** How to define design tokens given the styling approach */
	tokenStrategy: string
	/** Human-readable summary line for prompt injection */
	summary: string
}

/**
 * Resolves environment profile from the analyzed tech stack.
 * Called once before prompt generation; result is shared across all generators.
 */
export function resolveEnvironment(techStack: TechStack): EnvironmentProfile {
	const framework = techStack.framework.value
	const language = techStack.language.value
	const styling = techStack.styling.value.approach
	const buildTool = techStack.buildTool?.value ?? null
	const uiLibrary = techStack.uiLibrary?.value ?? null

	const hasConfidentFramework =
		techStack.framework.confidence !== "low" && framework !== "Unknown"

	const mode = hasConfidentFramework ? "existing-project" : "greenfield"
	const tokenStrategy = resolveTokenStrategy(styling)

	const summary = buildSummaryLine(mode, framework, language, styling, buildTool)

	logger.info(`Environment: ${mode} — ${summary}`)

	return {
		mode,
		framework,
		language,
		styling,
		buildTool,
		uiLibrary,
		tokenStrategy,
		summary,
	}
}

function resolveTokenStrategy(styling: string): string {
	const lower = styling.toLowerCase()

	if (lower.includes("tailwind")) {
		return "Define tokens in tailwind.config (theme.extend) and use CSS variables for runtime access"
	}
	if (lower.includes("css modules") || lower.includes("scss") || lower.includes("plain css")) {
		return "Define tokens as CSS custom properties in a global stylesheet (:root variables)"
	}
	if (lower.includes("styled") || lower.includes("emotion")) {
		return "Define tokens as a theme object passed through ThemeProvider"
	}
	if (lower.includes("vanilla extract")) {
		return "Define tokens using createThemeContract and createTheme"
	}

	return "Define tokens as CSS custom properties in a global stylesheet (:root variables)"
}

function buildSummaryLine(
	mode: string,
	framework: string,
	language: string,
	styling: string,
	buildTool: string | null,
): string {
	const parts = [framework, language, styling]
	if (buildTool) parts.push(buildTool)
	const stack = parts.join(" + ")

	return mode === "existing-project"
		? `Existing project: ${stack}`
		: `New project (stack to be chosen by agent)`
}

/**
 * Builds the environment section text to inject into prompts.
 * Generators call this to get a consistent environment description block.
 */
export function buildEnvironmentSection(env: EnvironmentProfile): string {
	if (env.mode === "greenfield") {
		return `## Environment
This is a NEW project. The agent will choose the tech stack. Describe design requirements without assuming a specific framework, styling library, or build tool.`
	}

	const lines: string[] = []
	lines.push("## Environment")
	lines.push(
		"The working directory already has a project set up. Integrate into the EXISTING environment:",
	)
	lines.push("")
	lines.push(`- **Framework**: ${env.framework}`)
	lines.push(`- **Language**: ${env.language}`)
	lines.push(`- **Styling**: ${env.styling}`)
	if (env.buildTool) lines.push(`- **Build Tool**: ${env.buildTool}`)
	if (env.uiLibrary) lines.push(`- **UI Library**: ${env.uiLibrary}`)
	lines.push("")
	lines.push(`**Token Strategy**: ${env.tokenStrategy}`)
	lines.push("")
	lines.push(
		"IMPORTANT: Use this stack's conventions and idioms. Do NOT suggest installing a different framework or switching the styling approach.",
	)

	return lines.join("\n")
}
