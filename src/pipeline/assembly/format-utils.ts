import type { ConsistencyMetrics } from "@defs/analysis.js"

/** Format an array of items as a markdown table */
export function formatTable(headers: string[], rows: string[][]): string {
	const headerLine = `| ${headers.join(" | ")} |`
	const separatorLine = `|${headers.map(() => "---").join("|")}|`
	const rowLines = rows.map((row) => `| ${row.join(" | ")} |`)
	return [headerLine, separatorLine, ...rowLines].join("\n")
}

/** Format a list of items with name-value pairs */
export function formatTokenList(
	items: { name: string; value: string }[],
	includeUsage?: boolean,
): string {
	if (items.length === 0) return "*No data available*"
	const lines: string[] = []
	for (const item of items) {
		lines.push(`- \`${item.name}\`: ${item.value}`)
	}
	return lines.join("\n")
}

/** Render consistency metrics section */
export function renderConsistency(
	consistency: ConsistencyMetrics | undefined,
): string {
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
