import { confidenceLevelSchema } from "@llm/schemas/common.js"
import { z } from "zod"

export const colorTokenSchema = z.object({
	name: z.string(),
	value: z.string().describe("hex, rgb, or hsl"),
	usage: z.string().describe("How this color is used in the design"),
	confidence: confidenceLevelSchema,
})

export const spacingTokenSchema = z.object({
	name: z.string(),
	value: z.string(),
	usage: z.string().describe("Where this spacing is commonly used"),
	confidence: confidenceLevelSchema,
})

export const tokenValueSchema = z.object({
	name: z.string(),
	value: z.string(),
	confidence: confidenceLevelSchema,
})

export const designTokensSchema = z.object({
	colors: z.array(colorTokenSchema),
	spacing: z.array(spacingTokenSchema),
	borderRadius: z.array(tokenValueSchema),
	shadows: z.array(tokenValueSchema),
	breakpoints: z.array(tokenValueSchema),
	zIndex: z.array(tokenValueSchema),
})

export const tokensDocSchema = z.object({
	colorPalette: z
		.string()
		.default("")
		.describe("Color palette section with tables and descriptions"),
	spacing: z.string().default("").describe("Spacing scale section"),
	borderRadius: z.string().default("").describe("Border radius section"),
	shadows: z.string().default("").describe("Shadow scale section"),
	otherTokens: z.string().default("").describe("Other design tokens section"),
})
