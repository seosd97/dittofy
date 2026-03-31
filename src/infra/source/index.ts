import { access, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import type { TechStack } from "@defs/analysis.js"
import type {
	ExtractionOutput,
	ExtractionResult,
	FileTreeNode,
	MonorepoContext,
	ProjectMeta,
} from "@defs/extraction.js"
import type { PhaseError, PhaseResult } from "@defs/pipeline.js"
import { phaseFail, phaseStart, phaseSuccess } from "@infra/logger.js"
import { buildFileTree, scanFiles } from "./file-scanner.js"
import { detectTechStack } from "./tech-stack-detector.js"

export { buildFileTree } from "./file-scanner.js"
export {
	FE_INDICATORS,
	detectApps,
	findMonorepoRoot,
	resolveWorkspaceDeps,
} from "./workspace-detector.js"

export type { ExtractionOutput } from "@defs/extraction.js"

export async function runExtraction(
	repoPath: string,
	monorepoInfo?: { rootPath: string; targetRelative: string; depPaths?: string[] },
	includePaths?: string[],
): Promise<PhaseResult<ExtractionOutput>> {
	const startTime = Date.now()
	const errors: PhaseError[] = []

	try {
		const scanResult = await scanFiles(repoPath)
		phaseStart("Phase 1", `Scanned ${scanResult.stats.totalScanned} files`)

		const depPaths = monorepoInfo?.depPaths ?? []

		// File tree: target's own tree + dependency package trees
		let fileTree = scanResult.fileTree

		if (monorepoInfo && depPaths.length > 0) {
			// Add dependency package trees alongside target tree
			const depNodes: FileTreeNode[] = []
			for (const depPath of depPaths) {
				try {
					const fullDepPath = resolve(monorepoInfo.rootPath, depPath)
					const depTree = await buildFileTree(fullDepPath)
					depNodes.push({
						path: depPath,
						type: "directory" as const,
						children: depTree,
					})
				} catch {
					// Skip unreadable dep
				}
			}
			fileTree = [...fileTree, ...depNodes]
		} else if (monorepoInfo) {
			// No dep paths: build from rootPath (legacy behavior)
			fileTree = await buildFileTree(monorepoInfo.rootPath, 0, 7)
		}

		// Merge --include paths into file tree
		if (includePaths && includePaths.length > 0) {
			const baseDir = monorepoInfo?.rootPath ?? repoPath
			const includeNodes: FileTreeNode[] = []
			for (const includePath of includePaths) {
				try {
					const fullPath = resolve(baseDir, includePath)
					await access(fullPath)
					const includeTree = await buildFileTree(fullPath)
					includeNodes.push({
						path: includePath,
						type: "directory" as const,
						children: includeTree,
					})
				} catch {
					// Skip unreadable include path
				}
			}
			if (includeNodes.length > 0) {
				fileTree = [...fileTree, ...includeNodes]
			}
		}

		const projectMeta = await buildProjectMeta(repoPath)
		const techStack = detectTechStack(projectMeta)

		const rootPath = monorepoInfo?.rootPath ?? repoPath
		const targetRelative = monorepoInfo?.targetRelative ?? ""

		const extraction: ExtractionResult = {
			projectMeta,
			fileTree,
		}

		const monorepo: MonorepoContext = {
			isMonorepo: !!monorepoInfo,
			rootPath,
			targetPath: repoPath,
			targetRelative,
			depPaths,
		}

		return {
			status: "completed",
			data: { extraction, techStack, monorepo },
			errors,
			duration: Date.now() - startTime,
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		errors.push({ phase: "Extraction", message, cause: error })
		phaseFail("Phase 1", message)
		return {
			status: "failed",
			errors,
			duration: Date.now() - startTime,
		}
	}
}

async function buildProjectMeta(repoPath: string): Promise<ProjectMeta> {
	const pkgPath = join(repoPath, "package.json")

	try {
		const pkgContent = await readFile(pkgPath, "utf-8")
		const pkg = JSON.parse(pkgContent)

		return {
			name: pkg.name ?? "unknown",
			packageManager: await detectPackageManager(repoPath),
			dependencies: pkg.dependencies ?? {},
			devDependencies: pkg.devDependencies ?? {},
			scripts: pkg.scripts ?? {},
		}
	} catch {
		return {
			name: "unknown",
			packageManager: "npm",
			dependencies: {},
			devDependencies: {},
			scripts: {},
		}
	}
}

async function detectPackageManager(repoPath: string): Promise<string> {
	const lockFiles: [string, string][] = [
		["pnpm-lock.yaml", "pnpm"],
		["yarn.lock", "yarn"],
		["bun.lockb", "bun"],
		["package-lock.json", "npm"],
	]

	for (const [lockFile, manager] of lockFiles) {
		try {
			await access(join(repoPath, lockFile))
			return manager
		} catch {
			// Lock file not found, try next
		}
	}

	return "npm"
}
