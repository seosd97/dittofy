import { consistencyMetricsSchema, designNotesSchema } from "@defs/schema-utils.js"
import { z } from "zod"

const breakpointOverrideSchema = z.object({
	breakpoint: z.string(),
	maxWidth: z.string().nullable().optional(),
	padding: z.string().nullable().optional(),
	columns: z.number().nullable().optional(),
	gap: z.string().nullable().optional(),
})

const spacingRhythmSchema = z.object({
	name: z.string().describe("e.g., section-gap, component-gap, element-gap"),
	value: z.string(),
	usage: z.string(),
})

const layoutContainerSchema = z.object({
	name: z.string(),
	maxWidth: z.string().nullable().optional(),
	padding: z.string().nullable().optional(),
	responsiveOverrides: z.array(breakpointOverrideSchema).nullable().optional(),
})

const gridSystemSchema = z.object({
	type: z.enum(["css-grid", "flexbox", "both"]),
	columns: z.number().nullable().optional(),
	gap: z.string().nullable().optional(),
})

const navigationPatternSchema = z.object({
	type: z.string(),
	description: z.string(),
})

export const layoutSystemSchema = z.object({
	approach: z.string(),
	containers: z.array(layoutContainerSchema),
	grids: z.array(gridSystemSchema),
	navigation: z.array(navigationPatternSchema),
	spacingRhythm: z.array(spacingRhythmSchema).nullable().optional(),
	consistency: consistencyMetricsSchema.nullable().optional(),
	designNotes: designNotesSchema,
})

export type LayoutSystem = z.infer<typeof layoutSystemSchema>
