import { readFile, stat } from "node:fs/promises"
import { extname, resolve } from "node:path"
import type { AspectName } from "@defs/aspect-map.js"
import type { CodeChunk, FileTreeNode } from "@defs/extraction.js"
import { logger } from "@utils/logger.js"
import type { AnalysisPlan } from "./plan-parser.js"

/**
 * Load files selected by the planner from disk.
 * Lazy loading: no files are pre-read; only planner-selected files are loaded.
 *
 * For monorepo dep paths: files whose path starts with a dep package prefix
 * are resolved from rootPath; all others resolve from rootPath (target).
 */
export async function loadSelectedFiles(
	plan: AnalysisPlan,
	rootPath: string,
	depPaths?: string[],
): Promise<CodeChunk[]> {
	const allSelected = [...new Set(Object.values(plan.fileSelection).flat())]
	const chunks: CodeChunk[] = []

	if (allSelected.length === 0) return chunks

	logger.info(`Loading ${allSelected.length} selected files`)

	for (const filePath of allSelected) {
		try {
			// For dep paths, resolve from rootPath (monorepo root)
			// For target files, resolve from rootPath (which is monorepo root or target)
			let fullPath: string | undefined
			if (depPaths) {
				for (const depPath of depPaths) {
					if (filePath.startsWith(depPath)) {
						fullPath = resolve(rootPath, filePath)
						break
					}
				}
			}
			fullPath = fullPath ?? resolve(rootPath, filePath)

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
 * Unified file resolution: resolve planner-selected files against the file tree,
 * and auto-supplement with scored files if match quality is too low.
 *
 * 1. Try 4-stage matching (exact → suffix → reverse suffix → filename) for each planner path
 * 2. Calculate match quality (resolved / total)
 * 3. If <50% resolved, supplement each aspect with auto-selected files based on scoring
 *
 * Mutates plan.fileSelection in place with resolved/supplemented paths.
 */
export function resolveFiles(
	plan: AnalysisPlan,
	fileTree: FileTreeNode[],
	targetRelative = "",
): { matchRate: number; supplemented: boolean } {
	const treeFiles = flattenTreePaths(fileTree)
	const treeFileArr = [...treeFiles]
	let totalSelected = 0
	let totalResolved = 0

	// Stage 1: Resolve planner paths via 4-stage matching
	for (const [aspect, files] of Object.entries(plan.fileSelection)) {
		if (!files) continue
		const resolved: string[] = []

		for (const f of files) {
			const match = resolveFilePath(f, treeFiles, treeFileArr, targetRelative)
			if (match) {
				resolved.push(match)
				logger.debug(`  ✓ ${f}${match !== f ? ` → ${match}` : ""}`)
			} else {
				logger.warn(`  ✗ ${f} (not found in tree)`)
			}
		}

		if (resolved.length < files.length) {
			logger.warn(`${aspect}: ${files.length - resolved.length}/${files.length} files not found`)
		}

		plan.fileSelection[aspect as AspectName] = resolved
		totalSelected += files.length
		totalResolved += resolved.length
	}

	if (totalSelected === 0) {
		return { matchRate: 1, supplemented: false }
	}

	const matchRate = totalResolved / totalSelected
	logger.info(
		`File selection: ${totalResolved}/${totalSelected} resolved (${(matchRate * 100).toFixed(0)}%)`,
	)

	// Stage 2: If match quality too low, supplement with auto-selected files
	if (matchRate < 0.5) {
		logger.warn("File selection quality too low (<50%). Supplementing with auto-selected files.")
		const autoSelected = selectFilesByScoring(fileTree, plan.aspects)
		plan.fileSelection = autoSelected
		return { matchRate, supplemented: true }
	}

	return { matchRate, supplemented: false }
}

/**
 * Resolve a planner-selected path against the tree using flexible matching:
 * 1. Exact match
 * 2. Suffix match (target package preferred when multiple candidates)
 * 3. Reverse suffix (selected has extra prefix)
 * 4. Filename-only (unique match only)
 */
function resolveFilePath(
	selected: string,
	treeFiles: Set<string>,
	treeFileArr: string[],
	targetRelative: string,
): string | null {
	// 1. Exact match
	if (treeFiles.has(selected)) return selected

	const lower = selected.toLowerCase()

	// 2. Suffix match — find all candidates, prefer target package
	const suffixMatches = treeFileArr.filter((t) => t.toLowerCase().endsWith(`/${lower}`))
	if (suffixMatches.length === 1) return suffixMatches[0]
	if (suffixMatches.length > 1) {
		if (targetRelative) {
			const targetMatch = suffixMatches.find((t) =>
				t.toLowerCase().startsWith(targetRelative.toLowerCase()),
			)
			if (targetMatch) return targetMatch
		}
		return suffixMatches.sort((a, b) => a.length - b.length)[0]
	}

	// 3. Reverse suffix (selected has extra prefix like "apps/web/src/..." but tree has "src/...")
	// Return the SELECTED path (not tree path) since it's root-relative and loadSelectedFiles needs it
	const reverseSuffix = treeFileArr.filter((t) => lower.endsWith(`/${t.toLowerCase()}`))
	if (reverseSuffix.length >= 1) return selected

	// 4. Filename-only match (last resort, only if unique)
	const filename = selected.split("/").pop()?.toLowerCase()
	if (filename) {
		const filenameMatches = treeFileArr.filter((t) => t.toLowerCase().split("/").pop() === filename)
		if (filenameMatches.length === 1) return filenameMatches[0]
	}

	return null
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

/** Aspect-specific file matching patterns */
const ASPECT_FILE_HINTS: Record<string, { pathHints: RegExp[]; extPriority: string[] }> = {
	designTokens: {
		pathHints: [/config/, /theme/, /token/, /variables/, /styles/, /\.css\.ts$/],
		extPriority: [".css.ts", ".css", ".scss", ".ts"],
	},
	typography: {
		pathHints: [/config/, /theme/, /font/, /typography/, /global/, /styles/],
		extPriority: [".css.ts", ".css", ".scss", ".ts"],
	},
	componentCatalog: {
		pathHints: [/component/, /ui\//, /atoms/, /molecules/],
		extPriority: [".tsx", ".jsx", ".vue", ".svelte"],
	},
	layoutSystem: {
		pathHints: [/layout/, /shell/, /header/, /footer/, /sidebar/, /nav/],
		extPriority: [".tsx", ".jsx", ".css.ts", ".css"],
	},
	pageStructures: {
		pathHints: [/page/, /app\//, /routes\//, /views\//],
		extPriority: [".tsx", ".jsx", ".vue", ".svelte"],
	},
	responsiveStrategy: {
		pathHints: [/config/, /breakpoint/, /responsive/, /media/, /styles/],
		extPriority: [".css.ts", ".css", ".scss", ".ts"],
	},
	interactionPatterns: {
		pathHints: [/animation/, /motion/, /transition/, /hover/, /component/],
		extPriority: [".tsx", ".jsx", ".css.ts", ".css"],
	},
}

/**
 * Score-based file selection per aspect.
 * Used internally when planner selection quality is too low.
 */
function selectFilesByScoring(
	fileTree: FileTreeNode[],
	aspects: AspectName[],
	maxPerAspect = 8,
): Partial<Record<AspectName, string[]>> {
	const allPaths = [...flattenTreePaths(fileTree)].filter((p) => {
		const ext = extname(p).toLowerCase()
		return UI_EXTENSIONS.has(ext) || p.endsWith(".css.ts")
	})

	// Config-like files shared across all aspects
	const configFiles = allPaths.filter(
		(p) =>
			p.includes("config") ||
			p.includes("theme") ||
			p.includes("token") ||
			p.includes("package.json"),
	)

	const selection: Partial<Record<AspectName, string[]>> = {}

	for (const aspect of aspects) {
		const hints = ASPECT_FILE_HINTS[aspect]
		if (!hints) {
			selection[aspect] = configFiles.slice(0, maxPerAspect)
			continue
		}

		// Score files by relevance to this aspect
		const scored = allPaths.map((p) => {
			let score = 0
			const lower = p.toLowerCase()

			// Path hint matching
			for (const hint of hints.pathHints) {
				if (hint.test(lower)) score += 10
			}

			// Extension priority
			const extIdx = hints.extPriority.findIndex((e) => lower.endsWith(e))
			if (extIdx !== -1) score += 5 - extIdx

			// Config bonus (always useful)
			if (lower.includes("config") || lower.includes("theme") || lower.includes("token")) {
				score += 3
			}

			return { path: p, score }
		})

		// Sort by score (highest first), take top N
		scored.sort((a, b) => b.score - a.score)
		const selected = scored
			.filter((s) => s.score > 0)
			.slice(0, maxPerAspect)
			.map((s) => s.path)

		// If not enough matched, add config files
		if (selected.length < 3) {
			for (const cf of configFiles) {
				if (!selected.includes(cf)) selected.push(cf)
				if (selected.length >= maxPerAspect) break
			}
		}

		selection[aspect] = selected
	}

	const totalFiles = new Set(Object.values(selection).flat()).size
	logger.warn(`Auto-selected ${totalFiles} files as fallback (planner selection failed)`)
	return selection
}
