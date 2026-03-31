/** Analysis phase control parameters */
export const ANALYSIS = {
	/** Max concurrent LLM calls */
	concurrency: 3,
	/** Minimum analyzers required for pipeline success */
	minAnalyzersRequired: 3,
	/** Total number of analyzers */
	totalAnalyzers: 7,
} as const

/** Instruction line count thresholds for complexity estimation */
export const COMPLEXITY_THRESHOLDS = {
	high: 40,
	medium: 20,
} as const

/** Minimum file resolution match rate before fast-failing */
export const MIN_FILE_MATCH_RATE = 0.5

/** Tier thresholds based on aspect count */
export const TIER_THRESHOLDS = {
	minimal: 3,
	full: 7,
} as const
