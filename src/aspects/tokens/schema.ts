import { confidenceLevelSchema } from "@llm/schemas/common.js"
import { consistencyMetricsSchema } from "@llm/schemas/consistency.js"
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

export const colorTokenGroupSchema = z.object({
	group: z.string().describe("Semantic group: primary, neutral, semantic, surface, accent"),
	level: z.enum(["primitive", "semantic"]).optional(),
	tokens: z.array(colorTokenSchema),
})

export const motionTokenSchema = z.object({
	name: z.string(),
	duration: z.string().describe("e.g., 150ms, 300ms"),
	easing: z.string().describe("e.g., ease-out, cubic-bezier(...)"),
	usage: z.string(),
	confidence: confidenceLevelSchema,
})

export const tokenUsageRefSchema = z.object({
	tokenName: z.string(),
	usedIn: z.array(z.string()).describe("Component or context names where token is used"),
	frequency: z.enum(["high", "medium", "low"]),
})

export const designTokensSchema = z.object({
	colors: z.array(colorTokenSchema),
	spacing: z.array(spacingTokenSchema),
	borderRadius: z.array(tokenValueSchema),
	shadows: z.array(tokenValueSchema),
	breakpoints: z.array(tokenValueSchema),
	zIndex: z.array(tokenValueSchema),
	colorGroups: z.array(colorTokenGroupSchema).optional(),
	motion: z.array(motionTokenSchema).optional(),
	tokenUsage: z.array(tokenUsageRefSchema).optional(),
	consistency: consistencyMetricsSchema.optional(),
})
