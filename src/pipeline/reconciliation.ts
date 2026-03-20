import type { AnalysisResultMap } from "@defs/aspect-map.js"
import { logger } from "@utils/logger.js"

export interface ReconciliationReport {
	conflicts: ReconciliationConflict[]
	resolutions: ReconciliationResolution[]
}

export interface ReconciliationConflict {
	aspect1: string
	aspect2: string
	field: string
	value1: string
	value2: string
}

export interface ReconciliationResolution {
	field: string
	resolvedValue: string
	source: "aspect-1" | "aspect-2"
	reason: string
}

/**
 * Cross-aspect conflict detection (informational).
 * Detects inconsistencies between aspect results and records them.
 * Resolutions are NOT applied to results — they're passed to essence synthesis
 * as context so the LLM can acknowledge and reconcile in the design narrative.
 */
export function reconcileAnalysis(results: AnalysisResultMap): ReconciliationReport {
	const conflicts: ReconciliationConflict[] = []
	const resolutions: ReconciliationResolution[] = []

	// tokens <-> responsive breakpoints
	if (results.designTokens && results.responsiveStrategy) {
		const tokenBPs = results.designTokens.breakpoints
		const responsiveBPs = results.responsiveStrategy.breakpoints

		if (tokenBPs.length > 0 && responsiveBPs.length > 0) {
			for (const rBP of responsiveBPs) {
				const tokenBP = tokenBPs.find((t) => t.name === rBP.name)
				if (tokenBP && tokenBP.value !== rBP.value) {
					conflicts.push({
						aspect1: "designTokens",
						aspect2: "responsiveStrategy",
						field: `breakpoint.${rBP.name}`,
						value1: tokenBP.value,
						value2: rBP.value,
					})

					// Resolve: token value wins (recorded in resolutions for essence synthesis)
					resolutions.push({
						field: `breakpoint.${rBP.name}`,
						resolvedValue: tokenBP.value,
						source: "aspect-1",
						reason: "Token breakpoint value takes precedence over responsive",
					})
				}
			}
		}
	}

	// tokens.spacing <-> layout.spacingRhythm
	if (results.designTokens && results.layoutSystem) {
		const tokenSpacing = results.designTokens.spacing
		const layoutRhythm = results.layoutSystem.spacingRhythm

		if (tokenSpacing.length > 0 && layoutRhythm && layoutRhythm.length > 0) {
			for (const lr of layoutRhythm) {
				const tokenMatch = tokenSpacing.find((t) => t.name === lr.name)
				if (tokenMatch && tokenMatch.value !== lr.value) {
					conflicts.push({
						aspect1: "designTokens",
						aspect2: "layoutSystem",
						field: `spacing.${lr.name}`,
						value1: tokenMatch.value,
						value2: lr.value,
					})

					resolutions.push({
						field: `spacing.${lr.name}`,
						resolvedValue: tokenMatch.value,
						source: "aspect-1",
						reason: "Token spacing value takes precedence over layout rhythm",
					})
				}
			}
		}
	}

	if (conflicts.length > 0) {
		logger.info(
			`Reconciliation: ${conflicts.length} conflicts found, ${resolutions.length} resolved`,
		)
	}

	return { conflicts, resolutions }
}

export function formatReconciliation(report: ReconciliationReport): string {
	const lines: string[] = ["# Reconciliation Report\n"]

	if (report.conflicts.length === 0) {
		lines.push("No conflicts found.")
		return lines.join("\n")
	}

	lines.push(`## Conflicts (${report.conflicts.length})\n`)
	for (const conflict of report.conflicts) {
		lines.push(
			`- **${conflict.field}**: ${conflict.aspect1}="${conflict.value1}" vs ${conflict.aspect2}="${conflict.value2}"`,
		)
	}

	if (report.resolutions.length > 0) {
		lines.push("\n## Resolutions\n")
		for (const res of report.resolutions) {
			lines.push(`- **${res.field}**: resolved to ${res.resolvedValue} (${res.reason})`)
		}
	}

	return lines.join("\n")
}
