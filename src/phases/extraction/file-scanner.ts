import { lstat, readdir } from "node:fs/promises"
import { extname, join } from "node:path"
import { glob } from "tinyglobby"
import {
	CONFIG_PATTERNS,
	EXTRACTION_LIMITS,
	IGNORE_PATTERNS,
	INCLUDE_EXTENSIONS,
	TREE_IGNORE_DIRS,
} from "../../constants/extraction.js"
import type { FileTreeNode } from "../../types/extraction.js"

export interface ScanResult {
	fileTree: FileTreeNode[]
	relevantFiles: string[]
	configFiles: string[]
	stats: {
		totalScanned: number
		ignored: number
		relevant: number
	}
}

export async function scanFiles(rootPath: string): Promise<ScanResult> {
	// Scan all files with ignore patterns
	const allFiles = await glob("**/*", {
		cwd: rootPath,
		ignore: [...IGNORE_PATTERNS],
		onlyFiles: true,
		dot: false,
	})

	// Filter by extension
	const includeSet = new Set<string>(INCLUDE_EXTENSIONS)
	const relevantFiles = allFiles.filter((file) => {
		const ext = extname(file).toLowerCase()
		return includeSet.has(ext)
	})

	// Collect config files separately
	const configFiles = await glob([...CONFIG_PATTERNS], {
		cwd: rootPath,
		ignore: [...IGNORE_PATTERNS],
		onlyFiles: true,
	})

	// Merge and deduplicate
	const allRelevant = [...new Set([...relevantFiles, ...configFiles])]

	// Build file tree
	const fileTree = await buildFileTree(rootPath)

	return {
		fileTree,
		relevantFiles: allRelevant,
		configFiles,
		stats: {
			totalScanned: allFiles.length,
			ignored: allFiles.length - relevantFiles.length,
			relevant: allRelevant.length,
		},
	}
}

async function buildFileTree(rootPath: string, depth = 0, maxDepth = EXTRACTION_LIMITS.fileTreeMaxDepth): Promise<FileTreeNode[]> {
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
