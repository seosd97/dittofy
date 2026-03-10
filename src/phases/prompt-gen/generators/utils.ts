import type { PromptStep } from "../../../types/prompts.js"

export function assemblePromptStep(
	stepNumber: number,
	filename: string,
	title: string,
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
	const content = `# Step ${stepNumber}: ${title}

## Goal
${data.goal}

## Prerequisites
${data.prerequisites}

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
		prerequisites: data.prerequisites.split("\n").filter((l) => l.trim()),
		estimatedComplexity: estimateComplexity(data.instructions),
	}
}

function estimateComplexity(instructions: string): "low" | "medium" | "high" {
	const lineCount = instructions.split("\n").length
	if (lineCount > 40) return "high"
	if (lineCount > 20) return "medium"
	return "low"
}
