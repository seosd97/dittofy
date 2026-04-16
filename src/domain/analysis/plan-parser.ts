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
	const seen = new Set<AspectName>()
	const dedupedAspects: AspectName[] = []
	for (const a of plan.aspects) {
		if (!seen.has(a)) {
			seen.add(a)
			dedupedAspects.push(a)
		}
	}

	const aspects = dedupedAspects.includes(REQUIRED_FIRST_ASPECT)
		? dedupedAspects
		: [REQUIRED_FIRST_ASPECT, ...dedupedAspects]

	let waves: AnalysisPlan["waves"]
	if (plan.waves.length === 0) {
		waves = [{ order: 1, aspects: [...aspects] }]
	} else if (!plan.waves[0].aspects.includes(REQUIRED_FIRST_ASPECT)) {
		waves = [
			{ ...plan.waves[0], aspects: [REQUIRED_FIRST_ASPECT, ...plan.waves[0].aspects] },
			...plan.waves.slice(1),
		]
	} else {
		waves = plan.waves.map((w) => ({ ...w, aspects: [...w.aspects] }))
	}

	return { ...plan, aspects, waves }
}
