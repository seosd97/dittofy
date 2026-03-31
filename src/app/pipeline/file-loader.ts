import { readFile, stat } from "node:fs/promises"
import { extname, resolve } from "node:path"
import type { CodeChunk } from "@defs/extraction.js"
import type { AnalysisPlan } from "@domain/analysis/plan-parser.js"
import { EXTRACTION_LIMITS } from "@domain/constants/extraction.js"
import { logger } from "@infra/logger.js"

// Re-export pure functions from domain
export { resolveFiles, flattenTreePaths } from "@domain/analysis/file-resolver.js"

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

	let failed = 0

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
			if (fileStat.size > EXTRACTION_LIMITS.maxFileSize) {
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
		} catch (error) {
			failed++
			const reason = error instanceof Error ? error.message : String(error)
			logger.warn(`Could not read: ${filePath} (${reason})`)
		}
	}

	if (failed > 0 && failed >= allSelected.length * 0.5) {
		logger.warn(
			`WARNING: ${failed}/${allSelected.length} files failed to load — analysis may be incomplete`,
		)
	}

	logger.info(`  Loaded ${chunks.length}/${allSelected.length} files`)
	return chunks
}
