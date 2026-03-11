import type { AnalysisResult } from "@defs/analysis.js"
import type { PromptStep } from "@defs/prompts.js"
import { callLLM } from "@llm/core/client.js"
import { PROMPT_GENERATOR_CONFIG } from "@llm/prompts/generators.js"
import { buildSystemPrompt } from "@llm/prompts/system.js"
import { promptStepSchema } from "@llm/schemas/prompts.js"
import type { UsageTracker } from "@llm/usage.js"
import type { LanguageModel } from "ai"
import { assemblePromptStep } from "./utils.js"

export async function generateSetupPrompt(
	analysis: AnalysisResult,
	context: string,
	model: LanguageModel,
	usage: UsageTracker,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt = buildSetupPromptText(analysis, context)

	const result = await callLLM({
		model,
		preset: "promptGenerator",
		system,
		prompt,
		schema: promptStepSchema,
		schemaName: "setup-prompt",
		schemaDescription: "Project setup implementation prompt",
	})

	usage.record("prompt-gen", "setup-prompt", result.usage)

	return assemblePromptStep(1, "step-01-project-setup.md", "Project Setup", [], result.data)
}

function buildSetupPromptText(_analysis: AnalysisResult, context: string): string {
	return `Generate a stack-agnostic implementation prompt for Step 1: Project Setup.

The AI agent needs to set up a new frontend project that implements the following design system. Do NOT mandate a specific framework, build tool, or styling library. Instead, describe the design system requirements (token structure, folder organization guidelines, design philosophy) so the agent can set up the project with any stack of its choice.

## Design Context
${context}

Generate a comprehensive, self-contained prompt that describes the design system to be implemented — token categories (colors, spacing, typography, radii, shadows), folder structure guidelines, and design philosophy. The agent should be able to start a project from scratch with any modern frontend stack.`
}
