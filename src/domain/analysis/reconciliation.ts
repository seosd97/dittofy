import type { AnalysisResultMap } from "@defs/aspect-map.js"

export interface ReconciliationConflict {
	field: string
	tokenValue: string
	otherValue: string
	otherAspect: string
}

export interface ReconciliationReport {
	conflicts: ReconciliationConflict[]
}

/**
 * Cross-aspect conflict detection (informational).
 * Detects inconsistencies between token values and other aspects.
 * Token values always take precedence — conflicts are passed to essence
 * synthesis as context so the LLM can acknowledge them in the narrative.
 */
export function reconcileAnalysis(
	results: AnalysisResultMap,
	log?: { info: (msg: string) => void },
): ReconciliationReport {
	const conflicts: ReconciliationConflict[] = []

	const tokens = results.designTokens
	if (!tokens) return { conflicts }

	// tokens <-> responsive breakpoints
	if (results.responsiveStrategy) {
		detectConflicts(
			tokens.breakpoints,
			results.responsiveStrategy.breakpoints,
			"breakpoint",
			"responsiveStrategy",
			conflicts,
		)
	}

	// tokens.spacing <-> layout.spacingRhythm
	if (results.layoutSystem?.spacingRhythm) {
		detectConflicts(
			tokens.spacing,
			results.layoutSystem.spacingRhythm,
			"spacing",
			"layoutSystem",
			conflicts,
		)
	}

	if (conflicts.length > 0) {
		log?.info(`Reconciliation: ${conflicts.length} conflicts found (token values take precedence)`)
	}

	return { conflicts }
}

function detectConflicts(
	tokenItems: { name: string; value: string }[],
	otherItems: { name: string; value: string }[],
	fieldPrefix: string,
	otherAspect: string,
	out: ReconciliationConflict[],
): void {
	if (tokenItems.length === 0 || otherItems.length === 0) return

	for (const other of otherItems) {
		const token = tokenItems.find((t) => t.name === other.name)
		if (token && token.value !== other.value) {
			out.push({
				field: `${fieldPrefix}.${other.name}`,
				tokenValue: token.value,
				otherValue: other.value,
				otherAspect,
			})
		}
	}
}

export function formatReconciliation(report: ReconciliationReport): string {
	const lines: string[] = ["# Reconciliation Report\n"]

	if (report.conflicts.length === 0) {
		lines.push("No conflicts found.")
		return lines.join("\n")
	}

	lines.push(`## Conflicts (${report.conflicts.length})\n`)
	lines.push("Token values take precedence in all cases.\n")
	for (const c of report.conflicts) {
		lines.push(`- **${c.field}**: token="${c.tokenValue}" vs ${c.otherAspect}="${c.otherValue}"`)
	}

	return lines.join("\n")
}
