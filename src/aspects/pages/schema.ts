import { confidenceLevelSchema } from "@llm/schemas/common.js"
import { consistencyMetricsSchema } from "@llm/schemas/consistency.js"
import { z } from "zod"

export const sectionInfoSchema = z.object({
	name: z.string(),
	hierarchyWeight: z.enum(["primary", "secondary", "tertiary"]).optional(),
	flowRelation: z.enum(["hero", "content", "cta", "footer", "sidebar", "auxiliary"]).optional(),
	components: z.array(z.string()).optional(),
})

export const pagePatternSchema = z.object({
	name: z.string().describe("e.g., landing, dashboard, detail, list"),
	description: z.string(),
	sectionFlow: z.array(z.string()).describe("Ordered section types"),
	confidence: confidenceLevelSchema,
})

export const pageInfoSchema = z.object({
	name: z.string(),
	route: z.string(),
	layout: z.string(),
	sections: z.array(z.string()),
	components: z.array(z.string()),
	confidence: confidenceLevelSchema,
	sectionDetails: z.array(sectionInfoSchema).optional(),
})

export const pageStructuresSchema = z.object({
	pages: z.array(pageInfoSchema),
	patterns: z.array(pagePatternSchema).optional(),
	consistency: consistencyMetricsSchema.optional(),
})