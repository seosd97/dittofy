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

export async function generateLayoutShellPrompt(
	step: StepPlanEntry,
	context: string,
	env: EnvironmentProfile,
	model: LanguageModel,
	usage: UsageTracker,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt = buildLayoutShellPromptText(step, context, env)

	const result = await callLLM({
		model,
		preset: "promptGenerator",
		system,
		prompt,
		schema: promptStepSchema,
		schemaName: "layout-shell-prompt",
		schemaDescription: "Layout shell implementation prompt",
	})

	usage.record("prompt-gen", `layout-shell-prompt-${step.stepNumber}`, result.usage)

	const paddedNum = String(step.stepNumber).padStart(2, "0")
	const filename = `step-${paddedNum}-layout-shell.md`

	return assemblePromptStep(step.stepNumber, filename, step.title, step.dependencies, result.data)
}

function buildLayoutShellPromptText(
	step: StepPlanEntry,
	context: string,
	env: EnvironmentProfile,
): string {
	return `Generate an implementation prompt for Step ${step.stepNumber}: ${step.title}.

The AI agent needs to build the structural layout shell — the skeleton that pages will be placed into. This includes the page container strategy, grid system primitives, navigation structure, and header/footer areas. This is NOT about page content; it's about the structural bones that all pages share.

${buildEnvironmentSection(env)}

## What to Build
- **Page container**: Max-width, padding, centering strategy
- **Grid system**: Column structure, gap values, how content is arranged
- **Navigation shell**: Sidebar, top-nav, or other navigation structure (just the skeleton, not nav items)
- **Header/Footer areas**: Structural slots with correct dimensions and positioning
- **Page wrapper**: How individual page content gets slotted into the shell

## What NOT to Build
- Actual page content (that comes in a later step)
- Specific navigation links or menu items
- Interactive behavior (that comes in a later step)

## Scope
${step.scope}

## Dependencies
This step depends on steps: ${step.dependencies.join(", ")}

## Layout System Context
${context}

Generate a comprehensive, self-contained prompt with all layout dimensions, grid specs, container values, and structural patterns inline. Use the design tokens defined in previous steps for spacing/colors.`
}
