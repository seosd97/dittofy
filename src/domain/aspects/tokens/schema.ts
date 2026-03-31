import {
	consistencyMetricsSchema,
	designNotesSchema,
	tokenValueSchema,
} from "@defs/schema-utils.js"
import { z } from "zod"

const colorTokenSchema = z.object({
	name: z.string(),
	value: z.string().describe("hex, rgb, or hsl"),
	usage: z.string().describe("How this color is used in the design"),
})

const spacingTokenSchema = z.object({
	name: z.string(),
	value: z.string(),
	usage: z.string().describe("Where this spacing is commonly used"),
})

const colorTokenGroupSchema = z.object({
	group: z.string().describe("Semantic group: primary, neutral, semantic, surface, accent"),
	level: z.enum(["primitive", "semantic"]).nullable().optional(),
	tokens: z.array(colorTokenSchema),
})

const motionTokenSchema = z.object({
	name: z.string(),
	duration: z.string().describe("e.g., 150ms, 300ms"),
	easing: z.string().describe("e.g., ease-out, cubic-bezier(...)"),
	usage: z.string(),
})

const themeVariantSchema = z.object({
	name: z.string(),
	colorOverrides: z.array(
		z.object({
			tokenName: z.string(),
			value: z.string(),
			derivation: z.enum(["inverted", "shifted", "preserved", "custom"]).nullable().optional(),
		}),
	),
	surfaceStrategy: z.string(),
})

export const designTokensSchema = z.object({
	spacing: z.array(spacingTokenSchema),
	borderRadius: z.array(tokenValueSchema),
	shadows: z.array(tokenValueSchema),
	breakpoints: z.array(tokenValueSchema),
	zIndex: z.array(tokenValueSchema),
	colorGroups: z.array(colorTokenGroupSchema).nullable().optional(),
	motion: z.array(motionTokenSchema).nullable().optional(),
	themeVariants: z.array(themeVariantSchema).nullable().optional(),
	defaultTheme: z.string().nullable().optional(),
	consistency: consistencyMetricsSchema.nullable().optional(),
	designNotes: designNotesSchema,
})

export type DesignTokens = z.infer<typeof designTokensSchema>
