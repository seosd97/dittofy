import { COMPLEXITY_THRESHOLDS } from "@config/analysis.js"
import type { PromptStep } from "@defs/prompts.js"

export function assemblePromptStep(
	stepNumber: number,
	filename: string,
	title: string,
	dependencies: number[],
	data: {
		goal: string
		prerequisites: string
		context: string
		instructions: string
		designReference: string
		expectedOutcome: string
		validation: string
	},
): PromptStep {
	const prerequisitesText =
		dependencies.length > 0
			? `Complete steps ${dependencies.join(", ")} before starting this step.`
			: "No prerequisites. This is the first step."

	const content = `# Step ${stepNumber}: ${title}

## Goal
${data.goal}

## Prerequisites
${prerequisitesText}

## Context
${data.context}

## Instructions
${data.instructions}

## Design Reference
${data.designReference}

## Expected Outcome
${data.expectedOutcome}

## Validation
${data.validation}
`

	return {
		stepNumber,
		filename,
		title,
		content,
		dependencies,
		estimatedComplexity: estimateComplexity(data.instructions),
	}
}

function estimateComplexity(instructions: string): "low" | "medium" | "high" {
	const lineCount = instructions.split("\n").length
	if (lineCount > COMPLEXITY_THRESHOLDS.high) return "high"
	if (lineCount > COMPLEXITY_THRESHOLDS.medium) return "medium"
	return "low"
}
