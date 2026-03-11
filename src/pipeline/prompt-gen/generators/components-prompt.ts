import type { PromptStep, StepPlanEntry } from "@defs/prompts.js"
import { callLLM } from "@llm/core/client.js"
import { PROMPT_GENERATOR_CONFIG } from "@llm/prompts/generators.js"
import { buildSystemPrompt } from "@llm/prompts/system.js"
import { promptStepSchema } from "@llm/schemas/prompts.js"
import type { UsageTracker } from "@llm/usage.js"
import type { LanguageModel } from "ai"
import { assemblePromptStep } from "./utils.js"

export async function generateComponentsPrompt(
	step: StepPlanEntry,
	context: string,
	model: LanguageModel,
	usage: UsageTracker,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt = buildComponentsPromptText(step, context)

	const result = await callLLM({
		model,
		preset: "promptGenerator",
		system,
		prompt,
		schema: promptStepSchema,
		schemaName: "components-prompt",
		schemaDescription: "Component implementation prompt",
	})

	usage.record("prompt-gen", `components-prompt-${step.stepNumber}`, result.usage)

	const paddedNum = String(step.stepNumber).padStart(2, "0")
	const filename = `step-${paddedNum}-components.md`

	return assemblePromptStep(step.stepNumber, filename, step.title, step.dependencies, result.data)
}

function buildComponentsPromptText(step: StepPlanEntry, context: string): string {
	return `Generate a stack-agnostic implementation prompt for Step ${step.stepNumber}: ${step.title}.

The AI agent needs to implement components matching the following visual specifications. Describe each component by its appearance, dimensions, colors, spacing, typography, variants, and props — not by framework-specific code. The agent will use its project's chosen stack to implement them.

## Scope
${step.scope}

## Dependencies
This step depends on steps: ${step.dependencies.join(", ")}

## Component Visual Specifications & Design Context
${context}

Generate a comprehensive, self-contained prompt that includes all component visual specs, prop definitions, variant details, and relevant design token values inline. Describe what each component looks like and how it behaves, not how to code it in a specific framework.`
}
