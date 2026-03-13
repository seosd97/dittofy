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

export async function generateDesignTokensPrompt(
	step: StepPlanEntry,
	context: string,
	env: EnvironmentProfile,
	model: LanguageModel,
	usage: UsageTracker,
	stepTitles: Map<number, string>,
	analysis: AnalysisResult,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt = buildDesignTokensPromptText(analysis, context, env)

	const result = await callLLM({
		model,
		preset: "promptGenerator",
		system,
		prompt,
		schema: promptStepSchema,
		schemaName: "design-tokens-prompt",
		schemaDescription: "Design tokens implementation prompt",
	})

	usage.record("prompt-gen", "design-tokens-prompt", result.usage)

	const paddedNum = String(step.stepNumber).padStart(2, "0")
	return assemblePromptStep(
		step.stepNumber,
		`step-${paddedNum}-design-tokens.md`,
		"Design Tokens",
		step.dependencies,
		result.data,
		{ stepType: "design-tokens", stepTitles },
	)
}

function buildDesignTokensPromptText(
	analysis: AnalysisResult,
	context: string,
	env: EnvironmentProfile,
): string {
	const { essence } = analysis
	return `Generate an implementation prompt for Design Tokens.

The AI agent needs to define all design tokens — the foundational visual values of the design system. This includes colors, spacing, border radius, shadows, z-index, and global base styles. Do NOT include typography (that is a separate step).

${buildEnvironmentSection(env)}

## Token Implementation Approach
${env.tokenStrategy}

## Design Essence
${essence.summary}

## Design Philosophy
${essence.designPhilosophy}

## Key Characteristics
${essence.keyCharacteristics.map((c) => `- ${c}`).join("\n")}

## Color Strategy
${essence.colorStrategy}

## Design Context
${context}

Generate a comprehensive, self-contained prompt that includes:
1. ALL color tokens as a name-value table with semantic naming (e.g., textPrimary, surfaceSecondary, borderSubtle — not color-1, color-2)
2. ALL spacing scale values
3. ALL border-radius tiers
4. ALL shadow/elevation levels
5. Z-index scale (if relevant)
6. Global base styles (CSS reset approach, body defaults, selection styles, scrollbar styling)
7. The design philosophy behind the token choices — WHY these values create this feel

Use exact values from context without alteration.`
}
