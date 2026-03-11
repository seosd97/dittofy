import type { AnalysisResult } from "@defs/analysis.js"
import type { PromptStep } from "@defs/prompts.js"
import { callLLM } from "@llm/core/client.js"
import { PROMPT_GENERATOR_CONFIG } from "@llm/prompts/generators.js"
import { buildSystemPrompt } from "@llm/prompts/system.js"
import { promptStepSchema } from "@llm/schemas/prompts.js"
import type { UsageTracker } from "@llm/usage.js"
import type { LanguageModel } from "ai"
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

	return assemblePromptStep(2, "step-02-design-system.md", "Design System", [1], result.data)
}

function buildDesignSystemPromptText(analysis: AnalysisResult, context: string): string {
	return `Generate a stack-agnostic implementation prompt for Step 2: Design System.

The AI agent needs to implement the design system including tokens, typography, colors, and base styles. Describe the token values and design rules abstractly — the agent will apply them using whatever styling solution its project uses. Do NOT generate framework-specific code (no Tailwind config, no CSS-in-JS imports, no createThemeContract, etc.).

## Original Styling Reference (informational only)
The source project used ${analysis.techStack.styling.value.approach}. This is provided as context, not a requirement.

## Design Context
${context}

## Design Philosophy
${analysis.essence.designPhilosophy}

## Color Strategy
${analysis.essence.colorStrategy}

## Typography Strategy
${analysis.essence.typographyStrategy}

Generate a comprehensive, self-contained prompt that includes ALL design token values as abstract name-value tables (colors, spacing, typography scale, border radii, shadows, breakpoints). Use exact values from the context without alteration. The agent must be able to implement the complete design system in any styling approach.`
}
