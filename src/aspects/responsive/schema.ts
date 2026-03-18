import { confidenceLevelSchema, confident } from "@llm/schemas/common.js"
import { consistencyMetricsSchema } from "@llm/schemas/consistency.js"
import { z } from "zod"

export const componentAdaptationSchema = z.object({
	component: z.string(),
	breakpoint: z.string(),
	adaptation: z.string().describe("What changes at this breakpoint"),
	confidence: confidenceLevelSchema,
})

export const layoutAdaptationSchema = z.object({
	layoutElement: z.string().describe("e.g., grid, navigation, sidebar"),
	breakpoint: z.string(),
	behavior: z.string().describe("e.g., collapse to hamburger, stack vertically"),
	confidence: confidenceLevelSchema,
})

export const breakpointInfoSchema = z.object({
	name: z.string(),
	value: z.string(),
	confidence: confidenceLevelSchema,
})

export const responsivePatternSchema = z.object({
	name: z.string(),
	description: z.string(),
	breakpoint: z.string(),
	confidence: confidenceLevelSchema,
})

export const responsiveStrategySchema = z.object({
	approach: confident(z.string()).describe("mobile-first or desktop-first"),
	breakpoints: z.array(breakpointInfoSchema),
	patterns: z.array(responsivePatternSchema),
	componentAdaptations: z.array(componentAdaptationSchema).optional(),
	layoutAdaptations: z.array(layoutAdaptationSchema).optional(),
	consistency: consistencyMetricsSchema.optional(),
})