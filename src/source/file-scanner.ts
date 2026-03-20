import { lstat, readdir } from "node:fs/promises"
import { extname, join } from "node:path"
import { EXTRACTION_LIMITS, TREE_IGNORE_DIRS } from "@config/extraction.js"
import type { FileTreeNode } from "@defs/extraction.js"

export interface ScanResult {
	fileTree: FileTreeNode[]
	stats: {
		totalScanned: number
	}
}

export async function scanFiles(rootPath: string): Promise<ScanResult> {
	// Build file tree
	const fileTree = await buildFileTree(rootPath)

	// Count total files in tree
	const totalScanned = countFiles(fileTree)

	return {
		fileTree,
		stats: {
			totalScanned,
		},
	}
}

function countFiles(nodes: FileTreeNode[]): number {
	let count = 0
	for (const node of nodes) {
		if (node.type === "file") {
			count++
		} else if (node.children) {
			count += countFiles(node.children)
		}
	}
	return count
}

export async function buildFileTree(
	rootPath: string,
	depth = 0,
	maxDepth: number = EXTRACTION_LIMITS.fileTreeMaxDepth,
): Promise<FileTreeNode[]> {
	if (depth > maxDepth) return []

	const entries = await readdir(rootPath, { withFileTypes: true })
	const nodes: FileTreeNode[] = []

	for (const entry of entries) {
		if (entry.name.startsWith(".") && TREE_IGNORE_DIRS.has(entry.name)) continue
		if (entry.name.startsWith(".") && depth === 0) continue
		if (TREE_IGNORE_DIRS.has(entry.name)) continue

		const fullPath = join(rootPath, entry.name)

		// Skip symlinks to avoid traversal issues
		if (entry.isSymbolicLink()) continue

		if (entry.isDirectory()) {
			const children = await buildFileTree(fullPath, depth + 1, maxDepth)
			nodes.push({
				path: entry.name,
				type: "directory",
				children,
			})
		} else {
			const fileStat = await lstat(fullPath)
			nodes.push({
				path: entry.name,
				type: "file",
				extension: extname(entry.name),
				size: fileStat.size,
			})
		}
	}

	return nodes.sort((a, b) => {
		if (a.type !== b.type) return a.type === "directory" ? -1 : 1
		return a.path.localeCompare(b.path)
	})
}
