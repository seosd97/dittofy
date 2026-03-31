import type { AspectName } from "@defs/aspect-map.js"
import type { FileTreeNode } from "@defs/extraction.js"
import { MIN_FILE_MATCH_RATE } from "@domain/constants/analysis.js"
import type { AnalysisPlan } from "./plan-parser.js"

export class FileSelectionError extends Error {
	readonly matchRate: number
	readonly totalSelected: number
	readonly totalResolved: number

	constructor(
		message: string,
		details: { matchRate: number; totalSelected: number; totalResolved: number },
	) {
		super(message)
		this.name = "FileSelectionError"
		this.matchRate = details.matchRate
		this.totalSelected = details.totalSelected
		this.totalResolved = details.totalResolved
	}
}

/**
 * Resolve planner-selected files against the file tree.
 *
 * 1. Try 4-stage matching (exact → suffix → reverse suffix → filename) for each planner path
 * 2. Calculate match quality (resolved / total)
 * 3. If <50% resolved, throw FileSelectionError (fast-fail)
 *
 * Returns a new plan with resolved fileSelection (does not mutate input).
 */
export function resolveFiles(
	plan: AnalysisPlan,
	fileTree: FileTreeNode[],
	targetRelative = "",
	log?: { debug: (msg: string) => void; warn: (msg: string) => void; info: (msg: string) => void },
): { matchRate: number; plan: AnalysisPlan } {
	const treeFiles = flattenTreePaths(fileTree)
	const treeFileArr = [...treeFiles]
	let totalSelected = 0
	let totalResolved = 0
	const resolvedSelection: AnalysisPlan["fileSelection"] = {}

	// Stage 1: Resolve planner paths via 4-stage matching
	for (const [aspect, files] of Object.entries(plan.fileSelection)) {
		if (!files) continue
		const resolved: string[] = []

		for (const f of files) {
			const match = resolveFilePath(f, treeFiles, treeFileArr, targetRelative)
			if (match) {
				resolved.push(match)
				log?.debug(`  ✓ ${f}${match !== f ? ` → ${match}` : ""}`)
			} else {
				log?.warn(`  ✗ ${f} (not found in tree)`)
			}
		}

		if (resolved.length < files.length) {
			log?.warn(`${aspect}: ${files.length - resolved.length}/${files.length} files not found`)
		}

		resolvedSelection[aspect as AspectName] = resolved
		totalSelected += files.length
		totalResolved += resolved.length
	}

	const updatedPlan = { ...plan, fileSelection: { ...plan.fileSelection, ...resolvedSelection } }

	if (totalSelected === 0) {
		return { matchRate: 1, plan: updatedPlan }
	}

	const matchRate = totalResolved / totalSelected
	log?.info(
		`File selection: ${totalResolved}/${totalSelected} resolved (${(matchRate * 100).toFixed(0)}%)`,
	)

	// Stage 2: If match quality too low, fail fast — static fallback is unreliable
	if (matchRate < MIN_FILE_MATCH_RATE) {
		throw new FileSelectionError(
			`File selection quality too low: ${totalResolved}/${totalSelected} resolved (${(matchRate * 100).toFixed(0)}%). The analysis planner could not match most files to the project structure. This usually means the project layout is unusual or the planner hallucinated paths.`,
			{ matchRate, totalSelected, totalResolved },
		)
	}

	return { matchRate, plan: updatedPlan }
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
