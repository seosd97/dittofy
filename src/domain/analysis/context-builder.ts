import type { CodeChunk, FileTreeNode } from "@defs/extraction.js"
import { CONTEXT_BUDGET, estimateTokens } from "@domain/constants/token-estimation.js"

export interface ContextBuildResult {
	codeContext: string
	fileStructure: string
	totalTokenEstimate: number
}

const DEFAULT_TOKEN_BUDGET: number = CONTEXT_BUDGET.defaultTokenBudget
const MAX_FILES_PER_ANALYZER: number = CONTEXT_BUDGET.maxFilesPerAnalyzer

/**
 * Build context from code chunks and file tree.
 * filePaths is required — the planner must provide file selection.
 */
export function buildContext(
	codeChunks: CodeChunk[],
	fileTree: FileTreeNode[],
	options: {
		filePaths: string[]
		tokenBudget?: number
	},
): ContextBuildResult {
	const tokenBudget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET

	const filePathSet = new Set(options.filePaths.map((p) => p.toLowerCase()))
	const filesToSelect = codeChunks.filter((c) => filePathSet.has(c.filePath.toLowerCase()))

	const selected: CodeChunk[] = []
	let usedTokens = 0

	for (const chunk of filesToSelect) {
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

export { estimateTokens } from "@domain/constants/token-estimation.js"

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
