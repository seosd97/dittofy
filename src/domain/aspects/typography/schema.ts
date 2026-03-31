import {
	consistencyMetricsSchema,
	designNotesSchema,
	tokenValueSchema,
} from "@defs/schema-utils.js"
import { z } from "zod"

const typographyScaleSchema = z.object({
	name: z.string(),
	fontSize: z.string(),
	lineHeight: z.string().nullable().optional(),
	fontWeight: z.string().nullable().optional(),
	usage: z.string().describe("Where this scale is used"),
})

const fontFamilyDefSchema = z.object({
	name: z.string(),
	category: z.enum(["sans-serif", "serif", "monospace", "display"]),
	fallbackStack: z.string().describe("Full CSS fallback stack"),
	usage: z.string().describe("Where this family is used: headings, body, code, etc."),
})

const letterSpacingSchema = z.object({
	name: z.string(),
	value: z.string(),
	usage: z.string(),
})

const responsiveFontScaleSchema = z.object({
	breakpoint: z.string(),
	scaleFactor: z.number().describe("Multiplier relative to base, e.g., 0.85 for mobile"),
	description: z.string(),
})

export const typographySystemSchema = z.object({
	fontFamilies: z.array(z.string()),
	scale: z.array(typographyScaleSchema),
	lineHeights: z.array(tokenValueSchema),
	fontWeights: z.array(tokenValueSchema),
	fontFamilyDefs: z.array(fontFamilyDefSchema).nullable().optional(),
	letterSpacings: z.array(letterSpacingSchema).nullable().optional(),
	responsiveScaling: z.array(responsiveFontScaleSchema).nullable().optional(),
	consistency: consistencyMetricsSchema.nullable().optional(),
	designNotes: designNotesSchema,
})

export type TypographySystem = z.infer<typeof typographySystemSchema>
