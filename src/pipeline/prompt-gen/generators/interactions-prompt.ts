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

	usage.record("prompt-gen", `interactions-prompt-${step.stepNumber}`, result.usage)

	const paddedNum = String(step.stepNumber).padStart(2, "0")
	const filename = `step-${paddedNum}-interactions.md`

	return assemblePromptStep(step.stepNumber, filename, step.title, step.dependencies, result.data)
}

function buildInteractionsPromptText(step: StepPlanEntry, context: string): string {
	return `Generate a stack-agnostic implementation prompt for Step ${step.stepNumber}: ${step.title}.

The AI agent needs to add animations, transitions, hover effects, and interactions to the showcase pages (Home, About) and the design system elements. Describe the visual behavior (duration, easing, trigger, what changes) — not framework-specific animation code. The agent will choose appropriate animation tools for its stack.

## Target
Apply interactions to:
- The Home and About showcase pages (page entrance animations, scroll effects, section transitions)
- Design system elements used in those pages (button hover/active states, link transitions, card hover effects)

## Scope
${step.scope}

## Dependencies
This step depends on steps: ${step.dependencies.join(", ")}

## Interaction Patterns & Animation Specs
${context}

Generate a comprehensive, self-contained prompt with all animation specs (duration, easing, properties), transition values, and interaction details inline. Describe what the user sees and how elements behave, not which animation library to use.`
}
