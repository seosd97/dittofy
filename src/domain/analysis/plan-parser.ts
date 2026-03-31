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

/** Required first aspect in every analysis plan */
const REQUIRED_FIRST_ASPECT = "designTokens" as const

export function validateAnalysisPlan(plan: AnalysisPlan): AnalysisPlan {
	// Ensure designTokens is always included
	const aspects = plan.aspects.includes(REQUIRED_FIRST_ASPECT)
		? plan.aspects
		: [REQUIRED_FIRST_ASPECT, ...plan.aspects]

	// Ensure designTokens is in Wave 1
	let waves = plan.waves
	if (waves.length === 0) {
		waves = [{ order: 1, aspects }]
	} else if (!waves[0].aspects.includes(REQUIRED_FIRST_ASPECT)) {
		waves = [
			{ ...waves[0], aspects: [REQUIRED_FIRST_ASPECT, ...waves[0].aspects] },
			...waves.slice(1),
		]
	}

	return { ...plan, aspects, waves }
}
