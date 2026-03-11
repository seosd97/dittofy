import { confidenceLevelSchema } from "@llm/schemas/common.js"
import { z } from "zod"

export const pageInfoSchema = z.object({
	name: z.string(),
	route: z.string(),
	layout: z.string(),
	sections: z.array(z.string()),
	components: z.array(z.string()),
	confidence: confidenceLevelSchema,
})

export const pageStructuresSchema = z.object({
	pages: z.array(pageInfoSchema),
})

export const pagesDocSchema = z.object({
	overview: z.string().default("").describe("Pages overview"),
	pageDetails: z.string().default("").describe("Detailed page-by-page section breakdown"),
})
