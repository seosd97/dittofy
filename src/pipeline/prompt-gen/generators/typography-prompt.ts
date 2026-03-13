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

export async function generateTypographyPrompt(
	step: StepPlanEntry,
	context: string,
	env: EnvironmentProfile,
	model: LanguageModel,
	usage: UsageTracker,
	stepTitles: Map<number, string>,
	analysis: AnalysisResult,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt = buildTypographyPromptText(analysis, context, env)

	const result = await callLLM({
		model,
		preset: "promptGenerator",
		system,
		prompt,
		schema: promptStepSchema,
		schemaName: "typography-prompt",
		schemaDescription: "Typography system implementation prompt",
	})

	usage.record("prompt-gen", "typography-prompt", result.usage)

	const paddedNum = String(step.stepNumber).padStart(2, "0")
	return assemblePromptStep(
		step.stepNumber,
		`step-${paddedNum}-typography.md`,
		"Typography",
		step.dependencies,
		result.data,
		{ stepType: "typography", stepTitles },
	)
}

function buildTypographyPromptText(
	analysis: AnalysisResult,
	context: string,
	env: EnvironmentProfile,
): string {
	const { essence } = analysis
	return `Generate an implementation prompt for Typography System.

The AI agent needs to implement the complete typography system — font families, type scale, font weights, line heights, and typographic rhythm. This builds on the design tokens defined in the previous step.

${buildEnvironmentSection(env)}

## Design Essence
${essence.summary}

## Typography Strategy
${essence.typographyStrategy}

## Design Context
${context}

Generate a comprehensive, self-contained prompt that includes:
1. Font family declarations (primary, secondary, monospace) with fallback stacks and their character/personality
2. Complete type scale table: name, font-size, line-height, font-weight, usage context (e.g., h1: 2.25rem / 2.5rem @ 700 — page titles)
3. Font weight scale with semantic names
4. Line height scale
5. Letter spacing values (if relevant)
6. Typographic rhythm rules — how headings relate to body text, minimum/maximum sizes, hierarchy principles
7. How to choose the right text style when creating new content

Use exact values from context without alteration.`
}
