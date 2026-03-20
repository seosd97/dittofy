import { CJK_RANGES, CONTEXT_BUDGET, TOKEN_RATIO } from "@config/token-estimation.js"
import type { CodeChunk, FileTreeNode } from "@defs/extraction.js"

export interface ContextBuildResult {
	codeContext: string
	fileStructure: string
	totalTokenEstimate: number
}

const DEFAULT_TOKEN_BUDGET: number = CONTEXT_BUDGET.defaultTokenBudget
const MAX_FILES_PER_ANALYZER: number = CONTEXT_BUDGET.maxFilesPerAnalyzer

/**
 * Build context from code chunks and file tree.
 * If filePaths provided, prioritize matched files first, then fill remaining budget.
 */
export function buildContext(
	codeChunks: CodeChunk[],
	fileTree: FileTreeNode[],
	options?: {
		filePaths?: string[]
		tokenBudget?: number
	},
): ContextBuildResult {
	const tokenBudget = options?.tokenBudget ?? DEFAULT_TOKEN_BUDGET

	// If filePaths provided, prioritize matched files
	let primaryFiles: CodeChunk[]
	let remainingFiles: CodeChunk[]

	if (options?.filePaths) {
		const filePathSet = new Set(options.filePaths.map((p) => p.toLowerCase()))
		primaryFiles = codeChunks.filter((c) => filePathSet.has(c.filePath.toLowerCase()))
		remainingFiles = codeChunks.filter((c) => !filePathSet.has(c.filePath.toLowerCase()))
	} else {
		primaryFiles = []
		remainingFiles = [...codeChunks]
	}

	// Sort remaining by size (smaller first = more files fit)
	remainingFiles.sort((a, b) => a.size - b.size)

	// Select files within budget
	const selected: CodeChunk[] = []
	let usedTokens = 0

	// Primary (planner-selected) files first
	for (const chunk of primaryFiles) {
		const tokens = estimateTokens(chunk.content)
		if (usedTokens + tokens > tokenBudget) continue
		selected.push(chunk)
		usedTokens += tokens
	}

	// Fill remaining budget
	for (const chunk of remainingFiles) {
		if (selected.length >= MAX_FILES_PER_ANALYZER) break
		const tokens = estimateTokens(chunk.content)
		if (usedTokens + tokens > tokenBudget) continue
		selected.push(chunk)
		usedTokens += tokens
	}

	const codeContext = selected.map((c) => `--- ${c.filePath} ---\n${c.content}`).join("\n\n")
	const fileStructure = buildFileStructureSummary(fileTree)

	return {
		codeContext,
		fileStructure,
		totalTokenEstimate: usedTokens + estimateTokens(fileStructure),
	}
}

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
	return Math.ceil(
		asciiLen / TOKEN_RATIO.asciiCharsPerToken + cjkCount * TOKEN_RATIO.cjkTokensPerChar,
	)
}

function buildFileStructureSummary(tree: FileTreeNode[], prefix = "", depth = 0): string {
	if (depth > 3) return ""
	const lines: string[] = []

	for (const node of tree) {
		if (node.type === "directory") {
			lines.push(`${prefix}- ${node.path}/`)
			if (node.children && node.children.length > 0) {
				lines.push(buildFileStructureSummary(node.children, `${prefix}  `, depth + 1))
			}
		} else {
			const sizeLabel = node.size != null ? ` (${formatFileSize(node.size)})` : ""
			lines.push(`${prefix}- ${node.path}${sizeLabel}`)
		}
	}

	return lines.filter(Boolean).join("\n")
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`
	return `${(bytes / 1024).toFixed(1)}KB`
}
