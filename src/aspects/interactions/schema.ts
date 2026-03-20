import { consistencyMetricsSchema, designNotesSchema } from "@defs/schema-utils.js"
import { z } from "zod"

const stateChoreographySchema = z.object({
	name: z.string().describe("e.g., page-enter, modal-open, list-stagger"),
	steps: z.array(z.string()).describe("Ordered animation steps"),
	description: z.string(),
})

const animationInfoSchema = z.object({
	name: z.string(),
	type: z.string(),
	description: z.string(),
	duration: z.string().nullable().optional(),
	easing: z.string().nullable().optional(),
	trigger: z.string().nullable().optional().describe("e.g., on-mount, on-scroll, on-hover"),
})

const transitionInfoSchema = z.object({
	property: z.string(),
	duration: z.string(),
	easing: z.string(),
})

const gestureInfoSchema = z.object({
	type: z.string(),
	description: z.string(),
	triggerElement: z.string().nullable().optional().describe("Which element triggers this gesture"),
	feedbackType: z.string().nullable().optional().describe("e.g., visual, haptic, sound"),
})

export const interactionPatternsSchema = z.object({
	animations: z.array(animationInfoSchema),
	transitions: z.array(transitionInfoSchema),
	gestures: z.array(gestureInfoSchema),
	choreography: z.array(stateChoreographySchema).nullable().optional(),
	consistency: consistencyMetricsSchema.nullable().optional(),
	designNotes: designNotesSchema,
})
