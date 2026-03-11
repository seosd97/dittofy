import type { PromptStep, StepPlanEntry } from "@defs/prompts.js"
import { callLLM } from "@llm/core/client.js"
import { PROMPT_GENERATOR_CONFIG } from "@llm/prompts/generators.js"
import { buildSystemPrompt } from "@llm/prompts/system.js"
import { promptStepSchema } from "@llm/schemas/prompts.js"
import type { UsageTracker } from "@llm/usage.js"
import type { LanguageModel } from "ai"
import { assemblePromptStep } from "./utils.js"

export async function generateResponsivePrompt(
	step: StepPlanEntry,
	context: string,
	model: LanguageModel,
	usage: UsageTracker,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt = buildResponsivePromptText(step, context)

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

	return assemblePromptStep(step.stepNumber, filename, step.title, step.dependencies, result.data)
}

function buildResponsivePromptText(step: StepPlanEntry, context: string): string {
	return `Generate a stack-agnostic implementation prompt for Step ${step.stepNumber}: ${step.title}.

The AI agent needs to implement responsive design including breakpoints and adaptive layouts. Describe breakpoint values, what changes at each breakpoint, and layout adaptation rules — not framework-specific responsive syntax (no Tailwind md: classes, no specific media query libraries). The agent will apply these rules using its project's chosen approach.

## Scope
${step.scope}

## Dependencies
This step depends on steps: ${step.dependencies.join(", ")}

## Responsive Strategy & Breakpoints
${context}

Generate a comprehensive, self-contained prompt with all breakpoint values, responsive patterns, and adaptation rules inline. Describe what changes visually at each breakpoint.`
}
