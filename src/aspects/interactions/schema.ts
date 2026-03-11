import { confidenceLevelSchema } from "@llm/schemas/common.js"
import { z } from "zod"

export const animationInfoSchema = z.object({
	name: z.string(),
	type: z.string(),
	description: z.string(),
	confidence: confidenceLevelSchema,
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
})

export const interactionPatternsSchema = z.object({
	animations: z.array(animationInfoSchema),
	transitions: z.array(transitionInfoSchema),
	gestures: z.array(gestureInfoSchema),
})

export const interactionsDocSchema = z.object({
	motionStyle: z.string().default("").describe("Overall motion style section"),
	animations: z.string().default("").describe("Animation patterns section"),
	transitions: z.string().default("").describe("Transition defaults section"),
	principles: z.string().default("").describe("Interaction design principles"),
})
