import { z } from "zod"

export const maturityLevelSchema = z.enum(["nascent", "developing", "mature", "comprehensive"])

export const consistencyMetricsSchema = z.object({
	score: z.number().min(0).max(100).describe("0-100 consistency score for this aspect"),
	strengths: z.array(z.string()).describe("Areas where the design is consistent"),
	issues: z.array(z.string()).describe("Areas where the design is inconsistent or incomplete"),
	maturity: maturityLevelSchema.describe("Design system maturity level for this aspect"),
})
