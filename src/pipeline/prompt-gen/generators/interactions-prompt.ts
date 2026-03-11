import type { PromptStep, StepPlanEntry } from "@defs/prompts.js"
import { callLLM } from "@llm/core/client.js"
import { PROMPT_GENERATOR_CONFIG } from "@llm/prompts/generators.js"
import { buildSystemPrompt } from "@llm/prompts/system.js"
import { promptStepSchema } from "@llm/schemas/prompts.js"
import type { UsageTracker } from "@llm/usage.js"
import type { LanguageModel } from "ai"
import { assemblePromptStep } from "./utils.js"

export async function generateInteractionsPrompt(
	step: StepPlanEntry,
	context: string,
	model: LanguageModel,
	usage: UsageTracker,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt = buildInteractionsPromptText(step, context)

	const result = await callLLM({
		model,
		preset: "promptGenerator",
		system,
		prompt,
		schema: promptStepSchema,
		schemaName: "interactions-prompt",
		schemaDescription: "Interactions and animations implementation prompt",
	})

	usage.record("prompt-gen", "interactions-prompt", result.usage)

	const paddedNum = String(step.stepNumber).padStart(2, "0")
	const filename = `step-${paddedNum}-interactions.md`

	return assemblePromptStep(step.stepNumber, filename, step.title, result.data)
}

function buildInteractionsPromptText(step: StepPlanEntry, context: string): string {
	return `Generate an implementation prompt for Step ${step.stepNumber}: ${step.title}.

The AI agent needs to implement animations, transitions, hover effects, and gesture-based interactions.

## Scope
${step.scope}

## Dependencies
This step depends on steps: ${step.dependencies.join(", ")}

## Interaction Patterns & Animation Specs
${context}

Generate a comprehensive, self-contained prompt with all animation specs, transition values, easing functions, and gesture details inline. The agent must be able to implement all interactions without external references.`
}
