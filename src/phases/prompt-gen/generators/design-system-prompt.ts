import type { LanguageModel } from "ai"
import { callLLM } from "../../../llm/client.js"
import { PROMPT_GENERATOR_CONFIG } from "../../../llm/prompts/generators.js"
import { buildSystemPrompt } from "../../../llm/prompts/system.js"
import { promptStepSchema } from "../../../llm/schemas/prompts.js"
import type { UsageTracker } from "../../../llm/usage.js"
import type { AnalysisResult } from "../../../types/analysis.js"
import type { PromptStep } from "../../../types/prompts.js"
import { assemblePromptStep } from "./utils.js"

export async function generateDesignSystemPrompt(
	analysis: AnalysisResult,
	context: string,
	model: LanguageModel,
	usage: UsageTracker,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt = buildDesignSystemPromptText(analysis, context)

	const result = await callLLM({
		model,
		preset: "promptGenerator",
		system,
		prompt,
		schema: promptStepSchema,
		schemaName: "design-system-prompt",
		schemaDescription: "Design system implementation prompt",
	})

	usage.record("prompt-gen", "design-system-prompt", result.usage)

	return assemblePromptStep(2, "step-02-design-system.md", "Design System", result.data)
}

function buildDesignSystemPromptText(analysis: AnalysisResult, context: string): string {
	return `Generate an implementation prompt for Step 2: Design System.

The AI agent needs to implement the design system including tokens, typography, colors, and base styles.

## Styling Approach
${analysis.techStack.styling.value.approach} (tier ${analysis.techStack.styling.value.tier})

## Design Context
${context}

## Design Philosophy
${analysis.essence.designPhilosophy}

## Color Strategy
${analysis.essence.colorStrategy}

## Typography Strategy
${analysis.essence.typographyStrategy}

Generate a comprehensive, self-contained prompt that includes ALL design token values inline. The agent must be able to implement the complete design system without any external references.`
}
