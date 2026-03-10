import { CONTEXT_BUDGET, CJK_RANGES, TOKEN_RATIO } from "../constants/token-estimation.js"
import type { CodeChunk, ConfigFile, FileCategory } from "../types/extraction.js"
import type { FileTreeNode } from "../types/extraction.js"

export interface ContextBuildResult {
	codeContext: string
	fileStructure: string
	configContext: string
	totalTokenEstimate: number
}

type AnalyzerType =
	| "token"
	| "typography"
	| "component"
	| "layout"
	| "page"
	| "responsive"
	| "interaction"

const ANALYZER_FILE_PRIORITIES: Record<AnalyzerType, FileCategory[]> = {
	token: ["config", "style", "component", "layout"],
	typography: ["config", "style", "component", "page"],
	component: ["component", "style", "hook", "type", "config"],
	layout: ["layout", "component", "page", "style", "config"],
	page: ["page", "layout", "component", "route", "config"],
	responsive: ["config", "style", "component", "layout", "page"],
	interaction: ["component", "hook", "style", "page", "config"],
}

const MUST_INCLUDE_PATTERNS: Record<AnalyzerType, RegExp[]> = {
	token: [/tailwind\.config/, /theme/, /variables/, /tokens/],
	typography: [/tailwind\.config/, /font/, /typography/],
	component: [],
	layout: [/layout/],
	page: [],
	responsive: [/tailwind\.config/, /breakpoint/],
	interaction: [/motion/, /animation/, /framer/],
}

const { defaultTokenBudget: DEFAULT_TOKEN_BUDGET, maxFilesPerAnalyzer: MAX_FILES_PER_ANALYZER } =
	CONTEXT_BUDGET

export function buildContextForAnalyzer(
	analyzerType: AnalyzerType,
	codeChunks: CodeChunk[],
	configFiles: ConfigFile[],
	fileTree: FileTreeNode[],
	tokenBudget = DEFAULT_TOKEN_BUDGET,
): ContextBuildResult {
	const priorities = ANALYZER_FILE_PRIORITIES[analyzerType]
	const mustInclude = MUST_INCLUDE_PATTERNS[analyzerType]

	// Budget allocation: config, code, rest is structure
	const configBudget = Math.floor(tokenBudget * CONTEXT_BUDGET.configRatio)
	const codeBudget = Math.floor(tokenBudget * CONTEXT_BUDGET.codeRatio)

	// 1. Build config context (budget-capped)
	let configTokens = 0
	const selectedConfigs: ConfigFile[] = []
	for (const c of configFiles) {
		const t = estimateTokens(c.content)
		if (configTokens + t > configBudget) continue
		selectedConfigs.push(c)
		configTokens += t
	}
	const configContext = selectedConfigs
		.map((c) => `--- ${c.filePath} (${c.type}) ---\n${c.content}`)
		.join("\n\n")

	// 2. Separate must-include files
	const mustFiles: CodeChunk[] = []
	const otherFiles: CodeChunk[] = []

	for (const chunk of codeChunks) {
		if (mustInclude.some((pattern) => pattern.test(chunk.filePath.toLowerCase()))) {
			mustFiles.push(chunk)
		} else {
			otherFiles.push(chunk)
		}
	}

	// 3. Sort other files by priority
	const sorted = [...otherFiles].sort((a, b) => {
		const pa = priorities.indexOf(a.category)
		const pb = priorities.indexOf(b.category)
		const ia = pa === -1 ? 999 : pa
		const ib = pb === -1 ? 999 : pb
		if (ia !== ib) return ia - ib
		return a.size - b.size
	})

	// 4. Select files within code budget (mustFiles also capped)
	const selected: CodeChunk[] = []
	let usedTokens = 0

	for (const f of mustFiles) {
		const t = estimateTokens(f.content)
		if (usedTokens + t > codeBudget) break
		selected.push(f)
		usedTokens += t
	}

	for (const chunk of sorted) {
		if (selected.length >= MAX_FILES_PER_ANALYZER) break
		const tokens = estimateTokens(chunk.content)
		if (usedTokens + tokens > codeBudget) continue
		selected.push(chunk)
		usedTokens += tokens
	}

	// 5. Build context string
	const codeContext = selected
		.map((c) => `--- ${c.filePath} (${c.category}) ---\n${c.content}`)
		.join("\n\n")

	// 6. Build file structure summary
	const fileStructure = buildFileStructureSummary(fileTree)

	return {
		codeContext,
		fileStructure,
		configContext,
		totalTokenEstimate: usedTokens + configTokens + estimateTokens(fileStructure),
	}
}

const { maxSummaryTokens: MAX_SUMMARY_TOKENS } = CONTEXT_BUDGET

export function buildAnalysisSummary(analysisResults: Record<string, unknown>): string {
	const full = JSON.stringify(analysisResults, null, 2)
	const estimated = estimateTokens(full)
	if (estimated <= MAX_SUMMARY_TOKENS) return full

	// Truncate large arrays to keep within budget
	const trimmed = JSON.parse(full) as Record<string, unknown>
	for (const [key, value] of Object.entries(trimmed)) {
		if (value && typeof value === "object") {
			trimArrayFields(value as Record<string, unknown>, 10)
		}
	}
	return JSON.stringify(trimmed, null, 2)
}

function trimArrayFields(obj: Record<string, unknown>, maxItems: number): void {
	for (const [key, value] of Object.entries(obj)) {
		if (Array.isArray(value) && value.length > maxItems) {
			obj[key] = [...value.slice(0, maxItems), `... and ${value.length - maxItems} more items`]
		} else if (value && typeof value === "object" && !Array.isArray(value)) {
			trimArrayFields(value as Record<string, unknown>, maxItems)
		}
	}
}

/**
 * Estimate token count with CJK awareness.
 * ASCII/Latin: ~4 chars per token. CJK: ~1.5 tokens per char.
 */
export function estimateTokens(text: string): number {
	let asciiLen = 0
	let cjkCount = 0
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i)
		if (CJK_RANGES.some(([start, end]) => code >= start && code <= end)) {
			cjkCount++
		} else {
			asciiLen++
		}
	}
	return Math.ceil(asciiLen / TOKEN_RATIO.asciiCharsPerToken + cjkCount * TOKEN_RATIO.cjkTokensPerChar)
}

function buildFileStructureSummary(tree: FileTreeNode[], prefix = "", depth = 0): string {
	if (depth > 3) return ""
	const lines: string[] = []

	for (const node of tree) {
		const icon = node.type === "directory" ? "📁" : "📄"
		lines.push(`${prefix}${icon} ${node.path}`)
		if (node.children && node.children.length > 0) {
			lines.push(buildFileStructureSummary(node.children, `${prefix}  `, depth + 1))
		}
	}

	return lines.filter(Boolean).join("\n")
}
