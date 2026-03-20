import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import type { TechStack } from "@defs/analysis.js"
import type { ExtractionResult, MonorepoContext, ProjectMeta } from "@defs/extraction.js"
import type { PhaseError, PhaseResult } from "@defs/pipeline.js"
import { phaseFail, phaseStart, phaseSuccess } from "@utils/logger.js"
import { buildFileTree, scanFiles } from "./file-scanner.js"
import { detectTechStack } from "./tech-stack-detector.js"

export { buildFileTree } from "./file-scanner.js"
export { findMonorepoRoot } from "./workspace-detector.js"

export interface ExtractionOutput {
	extraction: ExtractionResult
	techStack: TechStack
	monorepo: MonorepoContext
}

export async function runExtraction(
	repoPath: string,
	monorepoInfo?: { rootPath: string; targetRelative: string },
): Promise<PhaseResult<ExtractionOutput>> {
	const startTime = Date.now()
	const errors: PhaseError[] = []

	try {
		const scanResult = await scanFiles(repoPath)
		phaseStart("Phase 1", `Scanned ${scanResult.stats.totalScanned} files`)

		// File tree: from rootPath if monorepo (deeper depth), otherwise from repoPath
		const fileTree = monorepoInfo
			? await buildFileTree(monorepoInfo.rootPath, 0, 7)
			: scanResult.fileTree

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
