import type { PromptStep, StepPlanEntry } from "@defs/prompts.js"
import { callLLM } from "@llm/core/client.js"
import { PROMPT_GENERATOR_CONFIG } from "@llm/prompts/generators.js"
import { buildSystemPrompt } from "@llm/prompts/system.js"
import { promptStepSchema } from "@llm/schemas/prompts.js"
import type { UsageTracker } from "@llm/usage.js"
import type { LanguageModel } from "ai"
import { assemblePromptStep } from "./utils.js"

export async function generateShowcasePagesPrompt(
	step: StepPlanEntry,
	context: string,
	model: LanguageModel,
	usage: UsageTracker,
): Promise<PromptStep> {
	const system = buildSystemPrompt(PROMPT_GENERATOR_CONFIG)
	const prompt = buildShowcasePagesPromptText(step, context)

	const result = await callLLM({
		model,
		preset: "promptGenerator",
		system,
		prompt,
		schema: promptStepSchema,
		schemaName: "showcase-pages-prompt",
		schemaDescription: "Showcase page implementation prompt",
	})

	usage.record("prompt-gen", `showcase-pages-prompt-${step.stepNumber}`, result.usage)

	const paddedNum = String(step.stepNumber).padStart(2, "0")
	const filename = `step-${paddedNum}-showcase-pages.md`

	return assemblePromptStep(step.stepNumber, filename, step.title, step.dependencies, result.data)
}

function buildShowcasePagesPromptText(step: StepPlanEntry, context: string): string {
	return `Generate a stack-agnostic implementation prompt for Step ${step.stepNumber}: ${step.title}.

IMPORTANT: This is NOT about replicating the source project's pages. The AI agent needs to create two NEW showcase pages — Home and About — that DEMONSTRATE the extracted design system in action.

## Purpose
These pages serve as a living showcase of the design system. They should:
- Show the design tokens (colors, spacing, typography, shadows) applied in realistic context
- Apply the layout patterns and spacing rhythm extracted from the source
- Convey the design essence (mood, tone, visual character) of the extracted style

## Component Approach
No pre-built component library exists. The agent should create simple inline elements or small utility components as needed within the pages (e.g., a styled button, a section container, a card layout). These are NOT meant to be a full component library — just enough to demonstrate the design system's tokens and patterns in context.

## Pages to Create

### Home Page (/)
A landing/showcase page that:
- Uses the design system's typography scale for a compelling hero section
- Showcases the color palette and spacing rhythm through sections with varying backgrounds
- Includes simple interactive elements (buttons, links) styled with design tokens
- Applies the extracted layout system (grid, container strategy, visual hierarchy)

### About Page (/about)
An informational page that:
- Uses the design system's typography hierarchy for content-heavy layout
- Demonstrates sectioning with different background colors/surfaces from the token palette
- Shows content patterns (text blocks, lists, cards) with proper spacing rhythm
- Applies shadows, border-radius, and border tokens in context

## Scope
${step.scope}

## Dependencies
This step depends on steps: ${step.dependencies.join(", ")}

## Design System Context
${context}

Generate a comprehensive, self-contained prompt. The agent must create showcase pages that look and feel like the original design style, but with generic content — NOT the source project's business features, routes, or domain-specific UI.`
}
