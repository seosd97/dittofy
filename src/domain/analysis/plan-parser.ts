import type { AspectName } from "@defs/aspect-map.js"
import { z } from "zod"

const aspectNameSchema = z.enum([
	"designTokens",
	"typography",
	"componentCatalog",
	"layoutSystem",
	"pageStructures",
	"responsiveStrategy",
	"interactionPatterns",
])

const waveSchema = z.object({
	order: z.number(),
	aspects: z.array(aspectNameSchema),
})

export const analysisPlanSchema = z.object({
	projectSummary: z.string().describe("1-2 sentence assessment of the project"),
	aspects: z.array(aspectNameSchema).describe("Which aspects to analyze"),
	waves: z
		.array(waveSchema)
		.describe("Execution order — Wave 1 should always contain designTokens"),
	fileSelection: z
		.record(aspectNameSchema, z.array(z.string()))
		.describe("Per-aspect file paths to analyze"),
})

export type AnalysisPlan = z.infer<typeof analysisPlanSchema>

export function validateAnalysisPlan(plan: AnalysisPlan): AnalysisPlan {
	// Ensure designTokens is always included
	if (!plan.aspects.includes("designTokens")) {
		plan.aspects.unshift("designTokens")
	}

	// Ensure designTokens is in Wave 1
	if (plan.waves.length === 0) {
		plan.waves.push({ order: 1, aspects: plan.aspects })
	} else if (!plan.waves[0].aspects.includes("designTokens")) {
		plan.waves[0].aspects.unshift("designTokens")
	}

	return plan
}
