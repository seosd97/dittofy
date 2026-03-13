import { COMPLEXITY_THRESHOLDS } from "@config/analysis.js"
import type { PromptStep, StepType } from "@defs/prompts.js"
import { buildArtifactsSection, buildContractSection } from "../step-contracts.js"

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
	options: {
		stepType: StepType
		stepTitles?: Map<number, string>
	},
): PromptStep {
	const prerequisitesText = options.stepTitles
		? buildContractSection(options.stepType, dependencies, options.stepTitles)
		: dependencies.length > 0
			? `Complete steps ${dependencies.join(", ")} before starting this step.`
			: "No prerequisites. This is the first step."

	const artifactsText = `\n\n${buildArtifactsSection(options.stepType)}`

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
${data.expectedOutcome}${artifactsText}

## Validation
${data.validation}
`

	return {
		stepNumber,
		stepType: options.stepType,
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
