import { confidenceLevelSchema, confident } from "@llm/schemas/common.js"
import { consistencyMetricsSchema } from "@llm/schemas/consistency.js"
import { z } from "zod"

export const typographyScaleSchema = z.object({
	name: z.string(),
	fontSize: z.string(),
	lineHeight: z.string().optional(),
	fontWeight: z.string().optional(),
	usage: z.string().describe("Where this scale is used"),
	confidence: confidenceLevelSchema,
})

const tokenValueSchema = z.object({
	name: z.string(),
	value: z.string(),
	confidence: confidenceLevelSchema,
})

export const fontFamilyDefSchema = z.object({
	name: z.string(),
	category: z.enum(["sans-serif", "serif", "monospace", "display"]),
	fallbackStack: z.string().describe("Full CSS fallback stack"),
	usage: z.string().describe("Where this family is used: headings, body, code, etc."),
	confidence: confidenceLevelSchema,
})

export const letterSpacingSchema = z.object({
	name: z.string(),
	value: z.string(),
	usage: z.string(),
	confidence: confidenceLevelSchema,
})

export const responsiveFontScaleSchema = z.object({
	breakpoint: z.string(),
	scaleFactor: z.number().describe("Multiplier relative to base, e.g., 0.85 for mobile"),
	description: z.string(),
})

export const typographySystemSchema = z.object({
	fontFamilies: confident(z.array(z.string())),
	scale: z.array(typographyScaleSchema),
	lineHeights: z.array(tokenValueSchema),
	fontWeights: z.array(tokenValueSchema),
	fontFamilyDefs: z.array(fontFamilyDefSchema).optional(),
	letterSpacings: z.array(letterSpacingSchema).optional(),
	responsiveScaling: z.array(responsiveFontScaleSchema).optional(),
	consistency: consistencyMetricsSchema.optional(),
})