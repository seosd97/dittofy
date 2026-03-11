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

	return assemblePromptStep(1, "step-01-project-setup.md", "Project Setup", result.data)
}

function buildSetupPromptText(analysis: AnalysisResult, context: string): string {
	const techLines = [
		`- Framework: ${analysis.techStack.framework.value}`,
		`- Language: ${analysis.techStack.language.value}`,
		`- Styling: ${analysis.techStack.styling.value.approach} (tier ${analysis.techStack.styling.value.tier})`,
	]
	if (analysis.techStack.uiLibrary) {
		techLines.push(`- UI Library: ${analysis.techStack.uiLibrary.value}`)
	}
	if (analysis.techStack.stateManagement) {
		techLines.push(`- State Management: ${analysis.techStack.stateManagement.value}`)
	}
	if (analysis.techStack.buildTool) {
		techLines.push(`- Build Tool: ${analysis.techStack.buildTool.value}`)
	}

	return `Generate an implementation prompt for Step 1: Project Setup.

The AI agent needs to initialize a new project that matches the original design system.

## Tech Stack
${techLines.join("\n")}

## Design Context
${context}

Generate a comprehensive, self-contained prompt that an AI coding agent can follow to set up the project from scratch. Include all necessary commands, configurations, and file structures.`
}
