import { confidenceLevelSchema } from "@llm/schemas/common.js"
import { consistencyMetricsSchema } from "@llm/schemas/consistency.js"
import { z } from "zod"

export const stateChoreographySchema = z.object({
	name: z.string().describe("e.g., page-enter, modal-open, list-stagger"),
	steps: z.array(z.string()).describe("Ordered animation steps"),
	description: z.string(),
})

export const animationInfoSchema = z.object({
	name: z.string(),
	type: z.string(),
	description: z.string(),
	confidence: confidenceLevelSchema,
	duration: z.string().optional(),
	easing: z.string().optional(),
	trigger: z.string().optional().describe("e.g., on-mount, on-scroll, on-hover"),
})

export const transitionInfoSchema = z.object({
	property: z.string(),
	duration: z.string(),
	easing: z.string(),
	confidence: confidenceLevelSchema,
})

export const gestureInfoSchema = z.object({
	type: z.string(),
	description: z.string(),
	confidence: confidenceLevelSchema,
	triggerElement: z.string().optional().describe("Which element triggers this gesture"),
	feedbackType: z.string().optional().describe("e.g., visual, haptic, sound"),
})

export const interactionPatternsSchema = z.object({
	animations: z.array(animationInfoSchema),
	transitions: z.array(transitionInfoSchema),
	gestures: z.array(gestureInfoSchema),
	choreography: z.array(stateChoreographySchema).optional(),
	consistency: consistencyMetricsSchema.optional(),
})
