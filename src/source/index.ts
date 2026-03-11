import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import type { TechStack } from "@defs/analysis.js"
import type { ExtractionResult, ProjectMeta } from "@defs/extraction.js"
import type { PhaseError, PhaseResult } from "@defs/pipeline.js"
import { phaseFail, phaseStart, phaseSuccess } from "@utils/logger.js"
import { extractCode } from "./code-extractor.js"
import { extractConfigs } from "./config-extractor.js"
import { scanFiles } from "./file-scanner.js"
import { detectTechStack } from "./tech-stack-detector.js"

export interface ExtractionOutput {
	extraction: ExtractionResult
	techStack: TechStack
}

export async function runExtraction(repoPath: string): Promise<PhaseResult<ExtractionOutput>> {
	const startTime = Date.now()
	const errors: PhaseError[] = []

	try {
		const scanResult = await scanFiles(repoPath)
		phaseStart("Phase 1", `Scanned ${scanResult.stats.relevant} relevant files`)

		const codeChunks = await extractCode(repoPath, scanResult.relevantFiles)
		const configFiles = await extractConfigs(repoPath, scanResult.configFiles)
		const techStack = detectTechStack(configFiles, codeChunks)
		const projectMeta = await buildProjectMeta(repoPath)

		const extraction: ExtractionResult = {
			projectMeta,
			fileTree: scanResult.fileTree,
			codeChunks,
			configFiles,
		}

		return {
			status: "completed",
			data: { extraction, techStack },
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
