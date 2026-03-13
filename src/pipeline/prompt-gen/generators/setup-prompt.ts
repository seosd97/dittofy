import type { AnalysisResult } from "@defs/analysis.js"
import type { PromptStep, StepPlanEntry } from "@defs/prompts.js"
import { callLLM } from "@llm/core/client.js"
import { PROMPT_GENERATOR_CONFIG } from "@llm/prompts/generators.js"
import { buildSystemPrompt } from "@llm/prompts/system.js"
import { promptStepSchema } from "@llm/schemas/prompts.js"
import type { UsageTracker } from "@llm/usage.js"
import type { LanguageModel } from "ai"
import type { EnvironmentProfile } from "../resolve-environment.js"
import { buildEnvironmentSection } from "../resolve-environment.js"
import { assemblePromptStep } from "./utils.js"

export async function generateSetupPrompt(
	step: StepPlanEntry,
	context: string,
	env: EnvironmentProfile,
	model: LanguageModel,
	usage: UsageTracker,
	stepTitles: Map<number, string>,
	analysis: AnalysisResult,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt =
		env.mode === "existing-project"
			? buildExistingProjectPrompt(analysis, context, env)
			: buildGreenfieldPrompt(analysis, context, env)

	const result = await callLLM({
		model,
		preset: "promptGenerator",
		system,
		prompt,
		schema: promptStepSchema,
		schemaName: "setup-prompt",
		schemaDescription: "Project setup implementation prompt",
	})

	usage.record("prompt-gen", "setup-prompt", result.usage)

	const paddedNum = String(step.stepNumber).padStart(2, "0")
	return assemblePromptStep(
		step.stepNumber,
		`step-${paddedNum}-project-setup.md`,
		"Project Setup",
		step.dependencies,
		result.data,
		{ stepType: "setup", stepTitles },
	)
}

function buildExistingProjectPrompt(
	analysis: AnalysisResult,
	context: string,
	env: EnvironmentProfile,
): string {
	return `Generate an implementation prompt for Step 1: Project Setup — integrating a design system into an EXISTING ${env.framework} project.

The working directory already has a ${env.framework} + ${env.styling} + ${env.language} project. The AI agent should NOT create a new project or install a different framework. Instead, it should set up the design system infrastructure within the existing environment.

${buildEnvironmentSection(env)}

## What the Agent Should Do
1. **Design token infrastructure** — ${env.tokenStrategy}
2. **Global styles** — Set up base styles (CSS reset, body defaults, selection styles) using ${env.styling} conventions
3. **Folder structure** — Add design system folders that fit the existing project structure (e.g., tokens/, styles/, or whatever convention the project uses)
4. **Configuration updates** — Update ${env.styling} configuration if needed (e.g., extend Tailwind theme, add SCSS variables file)
${env.uiLibrary ? `5. **UI Library integration** — Align design tokens with ${env.uiLibrary} theming API` : ""}

## What the Agent Should NOT Do
- Create a new project or run project scaffolding commands
- Install a different framework, build tool, or styling library
- Restructure existing project files unrelated to the design system

## Design Context
${context}

Generate a comprehensive, self-contained prompt that describes exactly how to integrate the design system into this ${env.framework} project.`
}

function buildGreenfieldPrompt(
	_analysis: AnalysisResult,
	context: string,
	env: EnvironmentProfile,
): string {
	return `Generate a stack-agnostic implementation prompt for Step 1: Project Setup.

The AI agent needs to set up a new frontend project that implements the following design system. Do NOT mandate a specific framework, build tool, or styling library. Instead, describe the design system requirements (token structure, folder organization guidelines, design philosophy) so the agent can set up the project with any stack of its choice.

${buildEnvironmentSection(env)}

## Design Context
${context}

Generate a comprehensive, self-contained prompt that describes the design system to be implemented — token categories (colors, spacing, typography, radii, shadows), folder structure guidelines, and design philosophy. The agent should be able to start a project from scratch with any modern frontend stack.`
}
