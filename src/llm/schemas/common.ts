import { z } from "zod"

export const confidenceLevelSchema = z
	.enum(["high", "medium", "low"])
	.describe("Confidence level of the analysis")

export function confident<T extends z.ZodType>(schema: T) {
	return z.object({
		value: schema,
		confidence: confidenceLevelSchema,
	})
}
