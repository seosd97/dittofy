import { confidenceLevelSchema, confident } from "@llm/schemas/common.js"
import { z } from "zod"

export const layoutContainerSchema = z.object({
	name: z.string(),
	maxWidth: z.string().optional(),
	padding: z.string().optional(),
	confidence: confidenceLevelSchema,
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
	approach: confident(z.string()).describe("Overall layout approach"),
	containers: z.array(layoutContainerSchema),
	grids: z.array(gridSystemSchema),
	navigation: z.array(navigationPatternSchema),
})

export const layoutDocSchema = z.object({
	gridSystem: z.string().default("").describe("Grid system section"),
	containers: z.string().default("").describe("Container strategy section"),
	navigation: z.string().default("").describe("Navigation patterns section"),
	hierarchy: z.string().default("").describe("Visual hierarchy section"),
})
