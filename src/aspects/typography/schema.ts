import { confidenceLevelSchema, confident } from "@llm/schemas/common.js"
import { z } from "zod"

export const typographyScaleSchema = z.object({
	name: z.string().describe("Scale name, e.g. 'h1', 'body', 'caption'"),
	fontSize: z.string().describe("Font size value"),
	lineHeight: z.string().optional().describe("Line height"),
	fontWeight: z.string().optional().describe("Font weight"),
	usage: z.string().describe("Where this scale is used"),
	confidence: confidenceLevelSchema,
})

const tokenValueSchema = z.object({
	name: z.string(),
	value: z.string(),
	confidence: confidenceLevelSchema,
})

export const typographySystemSchema = z.object({
	fontFamilies: confident(z.array(z.string())).describe("Font families used"),
	scale: z.array(typographyScaleSchema).describe("Typography scale system"),
	lineHeights: z.array(tokenValueSchema).describe("Line height tokens"),
	fontWeights: z.array(tokenValueSchema).describe("Font weight tokens"),
})

export const typographyDocSchema = z.object({
	fontFamilies: z.string().default("").describe("Font families section"),
	typeScale: z.string().default("").describe("Type scale section with table"),
	principles: z.string().default("").describe("Typography principles section"),
})
