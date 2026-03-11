import type { PromptStep, StepPlanEntry } from "@defs/prompts.js"
import { callLLM } from "@llm/core/client.js"
import { PROMPT_GENERATOR_CONFIG } from "@llm/prompts/generators.js"
import { buildSystemPrompt } from "@llm/prompts/system.js"
import { promptStepSchema } from "@llm/schemas/prompts.js"
import type { UsageTracker } from "@llm/usage.js"
import type { LanguageModel } from "ai"
import { assemblePromptStep } from "./utils.js"

export async function generatePagesPrompt(
	step: StepPlanEntry,
	context: string,
	model: LanguageModel,
	usage: UsageTracker,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt = buildPagesPromptText(step, context)

	const result = await callLLM({
		model,
		preset: "promptGenerator",
		system,
		prompt,
		schema: promptStepSchema,
		schemaName: "pages-prompt",
		schemaDescription: "Page implementation prompt",
	})

	usage.record("prompt-gen", "pages-prompt", result.usage)

	const paddedNum = String(step.stepNumber).padStart(2, "0")
	const filename = `step-${paddedNum}-page-implementation.md`

	return assemblePromptStep(step.stepNumber, filename, step.title, result.data)
}

function buildPagesPromptText(step: StepPlanEntry, context: string): string {
	return `Generate an implementation prompt for Step ${step.stepNumber}: ${step.title}.

The AI agent needs to implement page layouts, routing, and compose components into complete pages.

## Scope
${step.scope}

## Dependencies
This step depends on steps: ${step.dependencies.join(", ")}

## Page Structure & Layout Context
${context}

Generate a comprehensive, self-contained prompt that includes page structures, routes, layout details, and component composition. The agent must be able to implement all pages without external references.`
}
