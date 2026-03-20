import { readFile, stat } from "node:fs/promises"
import { extname, resolve } from "node:path"
import type { AspectName } from "@defs/aspect-map.js"
import type { CodeChunk, FileTreeNode } from "@defs/extraction.js"
import { logger } from "@utils/logger.js"
import type { AnalysisPlan } from "./plan-parser.js"

/**
 * Load files selected by the planner from disk.
 * Lazy loading: no files are pre-read; only planner-selected files are loaded.
 */
export async function loadSelectedFiles(
	plan: AnalysisPlan,
	rootPath: string,
): Promise<CodeChunk[]> {
	const allSelected = [...new Set(Object.values(plan.fileSelection).flat())]
	const chunks: CodeChunk[] = []

	if (allSelected.length === 0) return chunks

	logger.info(`Loading ${allSelected.length} selected files`)

	for (const filePath of allSelected) {
		try {
			const fullPath = resolve(rootPath, filePath)
			const fileStat = await stat(fullPath)
			if (fileStat.size > 100 * 1024) {
				logger.debug(`Skipping large file: ${filePath}`)
				continue
			}
			const content = await readFile(fullPath, "utf-8")
			chunks.push({
				filePath,
				content,
				extension: extname(filePath),
				size: fileStat.size,
			})
		} catch {
			logger.debug(`Could not read: ${filePath}`)
		}
	}

	logger.info(`  Loaded ${chunks.length}/${allSelected.length} files`)
	return chunks
}

/**
 * Validate that planner-selected files actually exist in the file tree.
 * Removes invalid entries and warns. Returns false if <50% valid → trigger fallback.
 */
export function validateFileSelection(plan: AnalysisPlan, fileTree: FileTreeNode[]): boolean {
	const treeFiles = flattenTreePaths(fileTree)
	let totalSelected = 0
	let totalValid = 0

	for (const [aspect, files] of Object.entries(plan.fileSelection)) {
		if (!files) continue
		const valid = files.filter((f) => treeFiles.has(f))
		const invalid = files.filter((f) => !treeFiles.has(f))

		if (invalid.length > 0) {
			logger.warn(`Planner selected ${invalid.length} non-existent files for ${aspect}`)
		}

		plan.fileSelection[aspect as AspectName] = valid
		totalSelected += files.length
		totalValid += valid.length
	}

	if (totalSelected === 0) return true
	return totalValid / totalSelected >= 0.5
}

/** Flatten file tree into a Set of full paths */
export function flattenTreePaths(tree: FileTreeNode[], prefix = ""): Set<string> {
	const paths = new Set<string>()

	for (const node of tree) {
		const fullPath = prefix ? `${prefix}/${node.path}` : node.path
		if (node.type === "file") {
			paths.add(fullPath)
		}
		if (node.children) {
			for (const p of flattenTreePaths(node.children, fullPath)) {
				paths.add(p)
			}
		}
	}

	return paths
}

const UI_EXTENSIONS = new Set([".tsx", ".jsx", ".vue", ".svelte", ".css", ".scss", ".ts", ".js"])

/**
 * Auto-select files from tree when planner selection fails.
 * Picks UI-relevant files sorted by path (config-like files first, then components).
 */
export function autoSelectFiles(
	fileTree: FileTreeNode[],
	aspects: AspectName[],
	maxPerAspect = 8,
): Partial<Record<AspectName, string[]>> {
	const allPaths = [...flattenTreePaths(fileTree)].filter((p) => {
		const ext = extname(p).toLowerCase()
		return UI_EXTENSIONS.has(ext)
	})

	// Sort: config-like files first, then by path
	allPaths.sort((a, b) => {
		const aIsConfig = a.includes("config") || a.includes("theme") || a.includes("token") ? 0 : 1
		const bIsConfig = b.includes("config") || b.includes("theme") || b.includes("token") ? 0 : 1
		if (aIsConfig !== bIsConfig) return aIsConfig - bIsConfig
		return a.localeCompare(b)
	})

	const selection: Partial<Record<AspectName, string[]>> = {}
	const shared = allPaths.slice(0, maxPerAspect)

	for (const aspect of aspects) {
		selection[aspect] = [...shared]
	}

	logger.warn(`Auto-selected ${shared.length} files as fallback (planner selection failed)`)
	return selection
}
