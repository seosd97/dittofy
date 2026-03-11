import { confidenceLevelSchema } from "@llm/schemas/common.js"
import { z } from "zod"

export const colorTokenSchema = z.object({
	name: z.string().describe("Token name, e.g. 'primary', 'gray-500'"),
	value: z.string().describe("Color value in hex, rgb, or hsl"),
	usage: z.string().describe("How this color is used in the design"),
	confidence: confidenceLevelSchema,
})

export const spacingTokenSchema = z.object({
	name: z.string().describe("Token name, e.g. 'sm', 'md', 'lg' or '4', '8', '16'"),
	value: z.string().describe("Spacing value, e.g. '0.5rem', '8px'"),
	usage: z.string().describe("Where this spacing is commonly used"),
	confidence: confidenceLevelSchema,
})

export const tokenValueSchema = z.object({
	name: z.string(),
	value: z.string(),
	confidence: confidenceLevelSchema,
})

export const designTokensSchema = z.object({
	colors: z.array(colorTokenSchema).describe("Color palette tokens"),
	spacing: z.array(spacingTokenSchema).describe("Spacing scale tokens"),
	borderRadius: z.array(tokenValueSchema).describe("Border radius tokens"),
	shadows: z.array(tokenValueSchema).describe("Box shadow tokens"),
	breakpoints: z.array(tokenValueSchema).describe("Responsive breakpoints"),
	zIndex: z.array(tokenValueSchema).describe("Z-index scale"),
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
