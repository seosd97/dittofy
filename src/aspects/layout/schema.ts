import { confidenceLevelSchema, confident } from "@llm/schemas/common.js"
import { consistencyMetricsSchema } from "@llm/schemas/consistency.js"
import { z } from "zod"

export const breakpointOverrideSchema = z.object({
	breakpoint: z.string(),
	maxWidth: z.string().optional(),
	padding: z.string().optional(),
	columns: z.number().optional(),
	gap: z.string().optional(),
})

export const spacingRhythmSchema = z.object({
	name: z.string().describe("e.g., section-gap, component-gap, element-gap"),
	value: z.string(),
	usage: z.string(),
})

export const layoutContainerSchema = z.object({
	name: z.string(),
	maxWidth: z.string().optional(),
	padding: z.string().optional(),
	confidence: confidenceLevelSchema,
	responsiveOverrides: z.array(breakpointOverrideSchema).optional(),
})

export const gridSystemSchema = z.object({
	type: z.enum(["css-grid", "flexbox", "both"]),
	columns: z.number().optional(),
	gap: z.string().optional(),
	confidence: confidenceLevelSchema,
})

export const navigationPatternSchema = z.object({
	type: z.string(),
	description: z.string(),
	confidence: confidenceLevelSchema,
})

export const layoutSystemSchema = z.object({
	approach: confident(z.string()),
	containers: z.array(layoutContainerSchema),
	grids: z.array(gridSystemSchema),
	navigation: z.array(navigationPatternSchema),
	spacingRhythm: z.array(spacingRhythmSchema).optional(),
	consistency: consistencyMetricsSchema.optional(),
})