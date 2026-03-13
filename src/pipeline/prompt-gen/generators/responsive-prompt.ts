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

export async function generateResponsivePrompt(
	step: StepPlanEntry,
	context: string,
	env: EnvironmentProfile,
	model: LanguageModel,
	usage: UsageTracker,
	stepTitles: Map<number, string>,
	_analysis: AnalysisResult,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt = buildResponsivePromptText(step, context, env)

	const result = await callLLM({
		model,
		preset: "promptGenerator",
		system,
		prompt,
		schema: promptStepSchema,
		schemaName: "responsive-prompt",
		schemaDescription: "Responsive design implementation prompt",
	})

	usage.record("prompt-gen", `responsive-prompt-${step.stepNumber}`, result.usage)

	const paddedNum = String(step.stepNumber).padStart(2, "0")
	const filename = `step-${paddedNum}-responsive-design.md`

	return assemblePromptStep(step.stepNumber, filename, step.title, step.dependencies, result.data, {
		stepType: "responsive",
		stepTitles,
	})
}

function buildResponsivePromptText(
	step: StepPlanEntry,
	context: string,
	env: EnvironmentProfile,
): string {
	return `Generate an implementation prompt for Step ${step.stepNumber}: ${step.title}.

The AI agent needs to make the showcase pages (Home, About) and the design system responsive. Describe breakpoint values, what changes at each breakpoint, and layout adaptation rules.

${buildEnvironmentSection(env)}

## Target
Apply responsive behavior to:
- The Home and About showcase pages created in a previous step
- The design system's base styles and token usage (e.g., responsive typography, spacing adjustments)

## Scope
${step.scope}

## Dependencies
This step depends on steps: ${step.dependencies.join(", ")}

## Responsive Strategy & Breakpoints
${context}

Generate a comprehensive, self-contained prompt with all breakpoint values, responsive patterns, and adaptation rules inline. Describe what the user sees at each breakpoint and how layout/typography/spacing adapt.`
}
