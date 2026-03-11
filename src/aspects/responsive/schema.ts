import { confidenceLevelSchema, confident } from "@llm/schemas/common.js"
import { z } from "zod"

export const breakpointInfoSchema = z.object({
	name: z.string(),
	value: z.string(),
	confidence: confidenceLevelSchema,
})

export const responsivePatternSchema = z.object({
	name: z.string(),
	description: z.string(),
	breakpoint: z.string(),
	confidence: confidenceLevelSchema,
})

export const responsiveStrategySchema = z.object({
	approach: confident(z.string()).describe("mobile-first or desktop-first"),
	breakpoints: z.array(breakpointInfoSchema),
	patterns: z.array(responsivePatternSchema),
})

export const responsiveDocSchema = z.object({
	approach: z.string().default("").describe("Responsive approach section"),
	breakpoints: z.string().default("").describe("Breakpoints reference table"),
	patterns: z.string().default("").describe("Responsive patterns section"),
})
