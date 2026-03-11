import { z } from "zod"

export const promptStepSchema = z.object({
	goal: z
		.string()
		.describe(
			"Clear goal statement for this step, focused on what to achieve visually/structurally",
		),
	prerequisites: z.string().describe("What must be completed before this step"),
	context: z
		.string()
		.describe(
			"Design philosophy and visual context for this step. Do not prescribe a specific tech stack.",
		),
	instructions: z
		.string()
		.describe(
			"Step-by-step description of what to create in markdown. Focus on design specs, visual requirements, structure, and behavior — not framework-specific code or commands.",
		),
	designReference: z
		.string()
		.describe(
			"Design token values, component visual specs, spacing/color/typography values as abstract reference tables. Use exact values from context without alteration.",
		),
	expectedOutcome: z.string().describe("What should exist after completing this step"),
	validation: z.string().describe("How to verify the step was completed correctly"),
})
