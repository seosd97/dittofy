import { lstat, readdir } from "node:fs/promises"
import { extname, join } from "node:path"
import type { FileTreeNode } from "@defs/extraction.js"
import { logger } from "@infra/logger.js"
import { EXTRACTION_LIMITS, TREE_IGNORE_DIRS } from "./extraction-constants.js"

export interface ScanResult {
	fileTree: FileTreeNode[]
	stats: {
		totalScanned: number
		ignoredCount: number
	}
}

export async function scanFiles(rootPath: string): Promise<ScanResult> {
	// Build file tree
	const scanContext = { ignoredCount: 0 }
	const fileTree = await buildFileTree(rootPath, 0, undefined, scanContext)

	// Count total files in tree
	const totalScanned = countFiles(fileTree)

	return {
		fileTree,
		stats: {
			totalScanned,
			ignoredCount: scanContext.ignoredCount,
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
	scanContext?: { ignoredCount: number },
): Promise<FileTreeNode[]> {
	if (depth > maxDepth) return []

	let entries: import("node:fs").Dirent[]
	try {
		entries = await readdir(rootPath, { withFileTypes: true })
	} catch (error) {
		logger.warn(
			`Could not read directory: ${rootPath} (${(error as NodeJS.ErrnoException).code ?? "unknown"})`,
		)
		if (scanContext) scanContext.ignoredCount++
		return []
	}
	const nodes: FileTreeNode[] = []

	for (const entry of entries) {
		if (entry.name.startsWith(".") && TREE_IGNORE_DIRS.has(entry.name)) continue
		if (entry.name.startsWith(".") && depth === 0) continue
		if (TREE_IGNORE_DIRS.has(entry.name)) continue

		const fullPath = join(rootPath, entry.name)

		// Skip symlinks to avoid traversal issues
		if (entry.isSymbolicLink()) continue

		if (entry.isDirectory()) {
			const children = await buildFileTree(fullPath, depth + 1, maxDepth, scanContext)
			nodes.push({
				path: entry.name,
				type: "directory",
				children,
			})
		} else {
			try {
				const fileStat = await lstat(fullPath)
				nodes.push({
					path: entry.name,
					type: "file",
					extension: extname(entry.name),
					size: fileStat.size,
				})
			} catch (error) {
				logger.warn(
					`Could not stat file: ${fullPath} (${(error as NodeJS.ErrnoException).code ?? "unknown"})`,
				)
				if (scanContext) scanContext.ignoredCount++
			}
		}
	}

	return nodes.sort((a, b) => {
		if (a.type !== b.type) return a.type === "directory" ? -1 : 1
		return a.path.localeCompare(b.path)
	})
}
