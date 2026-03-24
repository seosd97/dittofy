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
