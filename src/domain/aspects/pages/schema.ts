import { consistencyMetricsSchema, designNotesSchema } from "@defs/schema-utils.js"
import { z } from "zod"

const pagePatternSchema = z.object({
	name: z.string().describe("e.g., landing, dashboard, detail, list"),
	description: z.string(),
	sectionFlow: z.array(z.string()).describe("Ordered section types"),
})

const pageInfoSchema = z.object({
	name: z.string(),
	route: z.string(),
	layout: z.string(),
	sections: z.array(z.string()),
	components: z.array(z.string()),
})

export const pageStructuresSchema = z.object({
	pages: z.array(pageInfoSchema),
	patterns: z.array(pagePatternSchema).nullable().optional(),
	consistency: consistencyMetricsSchema.nullable().optional(),
	designNotes: designNotesSchema,
})

export type PageStructures = z.infer<typeof pageStructuresSchema>
