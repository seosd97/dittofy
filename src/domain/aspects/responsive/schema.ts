import { consistencyMetricsSchema, designNotesSchema } from "@defs/schema-utils.js"
import { z } from "zod"

const componentAdaptationSchema = z.object({
	component: z.string(),
	breakpoint: z.string(),
	adaptation: z.string().describe("What changes at this breakpoint"),
})

const layoutAdaptationSchema = z.object({
	layoutElement: z.string().describe("e.g., grid, navigation, sidebar"),
	breakpoint: z.string(),
	behavior: z.string().describe("e.g., collapse to hamburger, stack vertically"),
})

const breakpointInfoSchema = z.object({
	name: z.string(),
	value: z.string(),
})

const responsivePatternSchema = z.object({
	name: z.string(),
	description: z.string(),
	breakpoint: z.string(),
})

export const responsiveStrategySchema = z.object({
	approach: z
		.string()
		.nullable()
		.optional()
		.describe("mobile-first or desktop-first; null if no responsive strategy detected"),
	breakpoints: z.array(breakpointInfoSchema),
	patterns: z.array(responsivePatternSchema),
	componentAdaptations: z.array(componentAdaptationSchema).nullable().optional(),
	layoutAdaptations: z.array(layoutAdaptationSchema).nullable().optional(),
	consistency: consistencyMetricsSchema.nullable().optional(),
	designNotes: designNotesSchema,
})
