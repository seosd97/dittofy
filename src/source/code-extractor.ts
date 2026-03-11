import { readFile, stat } from "node:fs/promises"
import { basename, extname, join } from "node:path"
import { EXTRACTION_LIMITS, FILE_CATEGORY_PRIORITY } from "@config/extraction.js"
import type { CodeChunk, FileCategory } from "@defs/extraction.js"
import { logger } from "@utils/logger.js"

export async function extractCode(rootPath: string, relevantFiles: string[]): Promise<CodeChunk[]> {
	const chunks: CodeChunk[] = []

	// Sort by priority: components/pages first, then styles, then others
	const sorted = [...relevantFiles].sort((a, b) => {
		const pa = getCategoryPriority(categorizeFile(a))
		const pb = getCategoryPriority(categorizeFile(b))
		return pa - pb
	})

	const filesToProcess = sorted.slice(0, EXTRACTION_LIMITS.maxFiles)

	if (sorted.length > EXTRACTION_LIMITS.maxFiles) {
		logger.warn(
			`${sorted.length} files found, processing top ${EXTRACTION_LIMITS.maxFiles} by priority`,
		)
	}

	for (const filePath of filesToProcess) {
		const fullPath = join(rootPath, filePath)

		try {
			const fileStat = await stat(fullPath)
			if (fileStat.size > EXTRACTION_LIMITS.maxFileSize) {
				logger.debug(`Skipping large file: ${filePath} (${(fileStat.size / 1024).toFixed(0)}KB)`)
				continue
			}

			const content = await readFile(fullPath, "utf-8")

			// Skip binary-like or data-heavy SVGs (base64 encoded images, long data URIs)
			const ext = extname(filePath).toLowerCase()
			if (
				ext === ".svg" &&
				(content.includes("base64,") || content.length > EXTRACTION_LIMITS.svgContentThreshold)
			) {
				logger.debug(`Skipping data-heavy SVG: ${filePath}`)
				continue
			}

			const category = categorizeFile(filePath)

			chunks.push({
				filePath,
				content,
				category,
				extension: extname(filePath),
				size: fileStat.size,
			})
		} catch {
			logger.debug(`Failed to read: ${filePath}`)
		}
	}

	return chunks
}

export function categorizeFile(filePath: string): FileCategory {
	const lowerPath = filePath.toLowerCase()
	const fileName = basename(filePath).toLowerCase()
	const ext = extname(filePath).toLowerCase()

	// Config files
	if (
		fileName === "package.json" ||
		fileName.startsWith("tailwind.config") ||
		fileName.startsWith("postcss.config") ||
		fileName === "tsconfig.json" ||
		fileName.startsWith("next.config") ||
		fileName.startsWith("vite.config") ||
		fileName.startsWith("nuxt.config") ||
		fileName.startsWith("svelte.config") ||
		fileName.startsWith("astro.config")
	) {
		return "config"
	}

	// Style files
	if ([".css", ".scss", ".sass", ".less"].includes(ext)) {
		return "style"
	}

	// Test files (shouldn't be here due to scanner, but just in case)
	if (fileName.includes(".test.") || fileName.includes(".spec.")) {
		return "test"
	}

	// API routes (check before page/route to avoid /api/ being classified as page)
	if (lowerPath.includes("/api/")) {
		return "api"
	}

	// Page files (Next.js pages/app, but NOT /routes/ which is SvelteKit/Remix route-based)
	if (lowerPath.includes("/pages/") || lowerPath.includes("/app/")) {
		if (fileName.startsWith("layout") || fileName.startsWith("_layout")) {
			return "layout"
		}
		return "page"
	}

	// Route files (SvelteKit/Remix patterns — may be pages or routes)
	if (lowerPath.includes("/routes/")) {
		if (
			fileName.startsWith("layout") ||
			fileName.startsWith("_layout") ||
			fileName.startsWith("+layout")
		) {
			return "layout"
		}
		if (fileName.startsWith("+page") || fileName.startsWith("+server")) {
			return "page"
		}
		return "route"
	}

	// Layout files
	if (lowerPath.includes("/layout") || fileName.includes("layout")) {
		return "layout"
	}

	// Hook files
	if (fileName.startsWith("use") && [".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
		return "hook"
	}

	// Store/Context files
	if (lowerPath.includes("/store") || lowerPath.includes("/stores")) {
		return "store"
	}
	if (lowerPath.includes("/context") || lowerPath.includes("/providers")) {
		return "context"
	}

	// Type files
	if (lowerPath.includes("/types/") || fileName.endsWith(".d.ts")) {
		return "type"
	}

	// Utility files
	if (
		lowerPath.includes("/utils/") ||
		lowerPath.includes("/lib/") ||
		lowerPath.includes("/helpers/")
	) {
		return "util"
	}

	// Component files (TSX/JSX/Vue/Svelte)
	if ([".tsx", ".jsx", ".vue", ".svelte", ".astro"].includes(ext)) {
		return "component"
	}

	// Asset files
	if (ext === ".svg" || lowerPath.includes("/assets/") || lowerPath.includes("/icons/")) {
		return "asset"
	}

	// Public files
	if (lowerPath.includes("/public/")) {
		return "public"
	}

	// Router config files
	if (lowerPath.includes("/router/")) {
		return "route"
	}

	return "other"
}

function getCategoryPriority(category: FileCategory): number {
	return FILE_CATEGORY_PRIORITY[category]
}
