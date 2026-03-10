import { z } from "zod"

export const stepPlanSchema = z.object({
	totalSteps: z.number().describe("Total number of implementation steps"),
	steps: z.array(
		z.object({
			stepNumber: z.number(),
			title: z.string().describe("Step title, e.g. 'Project Setup'"),
			scope: z.string().describe("What this step covers"),
			dependencies: z.array(z.number()).describe("Step numbers this depends on"),
		}),
	),
})

export const promptStepSchema = z.object({
	goal: z.string().describe("Clear goal statement for this step"),
	prerequisites: z.string().describe("What must be completed before this step"),
	context: z.string().describe("Design context relevant to this step"),
	instructions: z.string().describe("Step-by-step implementation instructions in markdown"),
	designReference: z.string().describe("Inline design specs (tokens, component specs) needed"),
	expectedOutcome: z.string().describe("What should exist after completing this step"),
	validation: z.string().describe("How to verify the step was completed correctly"),
})
