import { z } from "zod"

export const confidenceLevelSchema = z.enum(["high", "medium", "low"])

export const maturityLevelSchema = z.enum(["nascent", "developing", "mature", "comprehensive"])

export const consistencyMetricsSchema = z.object({
	score: z.number().min(0).max(100).describe("0-100 consistency score for this aspect"),
	strengths: z.array(z.string()).describe("Areas where the design is consistent"),
	issues: z.array(z.string()).describe("Areas where the design is inconsistent or incomplete"),
	maturity: maturityLevelSchema.describe("Design system maturity level for this aspect"),
})

export const designNotesSchema = z
	.object({
		observations: z.array(z.string()),
		anomalies: z.array(z.string()).optional(),
	})
	.nullable()
	.optional()

export type DesignNotes = z.infer<typeof designNotesSchema>
