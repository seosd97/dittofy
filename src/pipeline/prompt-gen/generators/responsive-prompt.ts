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

	usage.record("prompt-gen", "responsive-prompt", result.usage)

	const paddedNum = String(step.stepNumber).padStart(2, "0")
	const filename = `step-${paddedNum}-responsive-design.md`

	return assemblePromptStep(step.stepNumber, filename, step.title, result.data)
}

function buildResponsivePromptText(step: StepPlanEntry, context: string): string {
	return `Generate an implementation prompt for Step ${step.stepNumber}: ${step.title}.

The AI agent needs to implement responsive design including breakpoints, media queries, and adaptive layouts.

## Scope
${step.scope}

## Dependencies
This step depends on steps: ${step.dependencies.join(", ")}

## Responsive Strategy & Breakpoints
${context}

Generate a comprehensive, self-contained prompt with all breakpoint values, responsive patterns, and adaptation rules inline. The agent must be able to implement full responsive behavior without external references.`
}
