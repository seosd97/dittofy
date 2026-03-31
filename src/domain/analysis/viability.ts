import type { AnalysisResultMap, AspectName } from "@defs/aspect-map.js"

export interface ViabilityResult {
	viable: boolean
	score: number
	reason: string
	failedAspects: AspectName[]
	severity: "ok" | "warning" | "critical"
}

/** Viability score thresholds for analysis quality assessment */
const VIABILITY_THRESHOLDS = {
	abort: 0.4,
	warning: 0.7,
} as const

const ASPECT_CRITICALITY: Record<
	AspectName,
	{ weight: number; tier: "critical" | "important" | "enrichment" }
> = {
	designTokens: { weight: 10, tier: "critical" },
	typography: { weight: 8, tier: "critical" },
	layoutSystem: { weight: 7, tier: "important" },
	componentCatalog: { weight: 5, tier: "important" },
	pageStructures: { weight: 4, tier: "enrichment" },
	responsiveStrategy: { weight: 3, tier: "enrichment" },
	interactionPatterns: { weight: 2, tier: "enrichment" },
}

export function evaluateAnalysisViability(
	results: AnalysisResultMap,
	failedAnalyzers: string[],
): ViabilityResult {
	const failed = failedAnalyzers as AspectName[]
	const totalWeight = Object.values(ASPECT_CRITICALITY).reduce((sum, c) => sum + c.weight, 0)
	const failedWeight = failed.reduce((sum, name) => {
		return sum + (ASPECT_CRITICALITY[name]?.weight ?? 0)
	}, 0)
	const score = (totalWeight - failedWeight) / totalWeight

	// Rule 1: designTokens failure → always abort
	if (results.designTokens === null && failed.includes("designTokens")) {
		return {
			viable: false,
			score,
			reason: "Critical aspect 'designTokens' failed — cannot proceed without token definitions",
			failedAspects: failed,
			severity: "critical",
		}
	}

	// Rule 2: weighted score below abort threshold → abort
	if (score < VIABILITY_THRESHOLDS.abort) {
		return {
			viable: false,
			score,
			reason: `Weighted viability score ${(score * 100).toFixed(0)}% is below threshold (${VIABILITY_THRESHOLDS.abort * 100}%)`,
			failedAspects: failed,
			severity: "critical",
		}
	}

	// Rule 3: weighted score between abort and warning → warning
	if (score < VIABILITY_THRESHOLDS.warning) {
		return {
			viable: true,
			score,
			reason: `Weighted viability score ${(score * 100).toFixed(0)}% — proceeding with degraded output`,
			failedAspects: failed,
			severity: "warning",
		}
	}

	return {
		viable: true,
		score,
		reason: `Weighted viability score ${(score * 100).toFixed(0)}%`,
		failedAspects: failed,
		severity: "ok",
	}
}
