import type { ConsistencyMetrics } from "@defs/analysis.js"

/** Escape pipe and newline characters for markdown table cells */
export function sanitizeTableCell(text: string): string {
	return text.replace(/\|/g, "\\|").replace(/\n/g, " ")
}

/** Truncate long values for table display */
export function truncateValue(text: string, maxLen = 60): string {
	if (text.length <= maxLen) return text
	return `${text.substring(0, maxLen)}…`
}

/** Build a markdown table from headers and rows */
export function mdTable(headers: string[], rows: string[][]): string {
	const sep = headers.map((h) => "-".repeat(Math.max(h.length, 3)))
	const lines: string[] = []
	lines.push(`| ${headers.map(sanitizeTableCell).join(" | ")} |`)
	lines.push(`| ${sep.join(" | ")} |`)
	for (const row of rows) {
		lines.push(`| ${row.map((cell) => truncateValue(sanitizeTableCell(cell))).join(" | ")} |`)
	}
	return lines.join("\n")
}

/** Render consistency metrics section */
export function renderConsistency(consistency: ConsistencyMetrics | undefined): string {
	if (!consistency) return ""
	const lines: string[] = []
	lines.push("## Consistency Assessment\n")
	lines.push(`- **Score:** ${consistency.score}/100`)
	lines.push(`- **Maturity:** ${consistency.maturity}`)
	if (consistency.strengths.length > 0) {
		lines.push("\n**Strengths:**")
		for (const s of consistency.strengths) {
			lines.push(`- ${s}`)
		}
	}
	if (consistency.issues.length > 0) {
		lines.push("\n**Issues:**")
		for (const i of consistency.issues) {
			lines.push(`- ${i}`)
		}
	}
	return lines.join("\n")
}
