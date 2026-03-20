import type { AnalysisResultMap, AspectName } from "@defs/aspect-map.js"

export interface ViabilityResult {
	viable: boolean
	score: number
	reason: string
	failedAspects: AspectName[]
	severity: "ok" | "warning" | "critical"
}

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

	// Rule 2: weighted score < 0.4 → abort
	if (score < 0.4) {
		return {
			viable: false,
			score,
			reason: `Weighted viability score ${(score * 100).toFixed(0)}% is below threshold (40%)`,
			failedAspects: failed,
			severity: "critical",
		}
	}

	// Rule 3: weighted score 0.4~0.7 → warning
	if (score < 0.7) {
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
