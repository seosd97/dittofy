import {
	type AnalysisPlan,
	analysisPlanSchema,
	validateAnalysisPlan,
} from "@domain/analysis/plan-parser.js"
import { buildSystemPrompt } from "@domain/llm-prompts/index.js"
import type { ILLMClient } from "@infra/llm/client.js"
import type { UsageTracker } from "@infra/llm/usage.js"
import { logger } from "@infra/logger.js"
import type { Workspace } from "./workspace.js"

const PLANNER_SYSTEM_PROMPT = buildSystemPrompt({
	role: "You are a frontend architecture analyst specializing in design system extraction.",
	task: `Given a project's file structure and metadata, create an analysis plan for extracting its design system.

You must decide:
1. Which aspects to analyze (from: designTokens, typography, componentCatalog, layoutSystem, pageStructures, responsiveStrategy, interactionPatterns)
2. Which files are relevant for each aspect
3. The execution order (waves) — designTokens should always be in Wave 1

Rules:
- Always include designTokens and typography (they are foundational)
- Include componentCatalog if component files exist
- Include layoutSystem if layout files exist
- Include pageStructures if page/route files exist
- Include responsiveStrategy if CSS/style files with potential media queries exist
- Include interactionPatterns only for larger projects with animation libraries or CSS transitions
- Wave 1: designTokens (always first — other aspects reference its results)
- Wave 2: aspects that depend only on designTokens (typography, layoutSystem)
- Wave 3: remaining aspects (componentCatalog, pageStructures, responsiveStrategy, interactionPatterns)
- Include config files (tailwind.config.*, theme.css.ts, tokens.ts, package.json, etc.) in file selection when relevant to the aspect
- For designTokens and typography aspects, include any .css.ts files that define theme variables or token values
- Select 3-8 most relevant files per aspect
- Only select files that exist in the provided file tree`,
})

export async function planAnalysis(
	workspace: Workspace,
	client: ILLMClient,
	usage: UsageTracker,
	language: "en" | "ko",
): Promise<AnalysisPlan> {
	const fileTree = await workspace.readMarkdown("file-tree.md")
	const projectMeta = await workspace.readMarkdown("project-meta.md")

	const prompt = `## Project File Structure
${fileTree}

## Project Metadata
${projectMeta}

## Instructions
Create an analysis plan for extracting the design system from this project.

CRITICAL: In the fileSelection field, you MUST use EXACT file paths from the file tree above.
Copy-paste paths directly from the tree — do NOT guess or invent paths.
For example, if the tree shows "apps/web/src/styles/theme.css.ts (2.8KB)", use exactly "apps/web/src/styles/theme.css.ts".

Select 3-8 most relevant files per aspect:
- designTokens: config files (tailwind.config.*, theme.*, tokens.*), CSS/style files with variables
- typography: font config files, global style files, text component files
- componentCatalog: .tsx/.jsx/.vue component files
- layoutSystem: layout files, app shell, navigation components
- pageStructures: page/route files
- responsiveStrategy: files with breakpoints, media queries, responsive utilities
- interactionPatterns: files with animations, transitions, hover effects`

	const result = await client.call({
		preset: "analysisPlanner",
		system: PLANNER_SYSTEM_PROMPT,
		prompt,
		schema: analysisPlanSchema,
		schemaName: "AnalysisPlan",
		schemaDescription: "Analysis plan for design system extraction",
	})

	usage.record("Planning", "Analysis Planner", result.usage)

	const plan = validateAnalysisPlan(result.data)

	// Save human-readable version for debugging
	await workspace.writeMarkdown("analysis-plan.md", renderPlanAsMarkdown(plan))

	logger.info("Analysis plan generated")
	return plan
}

function renderPlanAsMarkdown(plan: AnalysisPlan): string {
	const lines: string[] = ["# Analysis Plan\n"]

	lines.push("## Project Assessment")
	lines.push(plan.projectSummary)
	lines.push("")

	lines.push("## Aspects")
	for (const a of plan.aspects) {
		lines.push(`- ${a}`)
	}
	lines.push("")

	lines.push("## Waves")
	for (const w of plan.waves) {
		lines.push(`### Wave ${w.order}`)
		for (const a of w.aspects) {
			lines.push(`- ${a}`)
		}
		lines.push("")
	}

	lines.push("## File Selection")
	for (const [aspect, files] of Object.entries(plan.fileSelection)) {
		lines.push(`### ${aspect}`)
		for (const f of files) {
			lines.push(`- ${f}`)
		}
		lines.push("")
	}

	return lines.join("\n")
}
