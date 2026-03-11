import { confidenceLevelSchema, confident } from "@llm/schemas/common.js"
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

export const typographySystemSchema = z.object({
	fontFamilies: confident(z.array(z.string())),
	scale: z.array(typographyScaleSchema),
	lineHeights: z.array(tokenValueSchema),
	fontWeights: z.array(tokenValueSchema),
})

export const typographyDocSchema = z.object({
	fontFamilies: z.string().default("").describe("Font families section"),
	typeScale: z.string().default("").describe("Type scale section with table"),
	principles: z.string().default("").describe("Typography principles section"),
})
