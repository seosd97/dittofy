import { access, readFile, readdir, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join, resolve } from "node:path"
import { UserError } from "@defs/errors.js"
import { logger } from "@infra/logger.js"
import { downloadTemplate } from "giget"
import { FE_INDICATORS } from "./workspace-detector.js"

export interface ResolvedRepo {
	localPath: string
	source: string
	projectName: string
	isTemporary: boolean
	/** Call after pipeline completes to remove temp directories */
	cleanup: () => Promise<void>
}

export async function resolveRepo(source: string, packageOption?: string): Promise<ResolvedRepo> {
	const type = classifyInput(source)

	let repo: ResolvedRepo
	if (type === "github") {
		repo = await resolveGitHub(source)
	} else {
		repo = await resolveLocal(source)
	}

	try {
		if (packageOption) {
			const pkgPath = join(repo.localPath, packageOption)
			try {
				await access(join(pkgPath, "package.json"))
			} catch {
				throw new UserError(
					`Package not found: ${packageOption}. Make sure the path exists within the repository.`,
				)
			}
			repo.localPath = pkgPath
			repo.projectName = basename(pkgPath)
		} else {
			const monorepo = await detectMonorepo(repo.localPath)
			if (monorepo.selectedPackage) {
				logger.info(`Monorepo detected — auto-selected FE package: ${monorepo.selectedPackage}`)
				repo.localPath = join(repo.localPath, monorepo.selectedPackage)
				repo.projectName = basename(monorepo.selectedPackage)
			} else if (monorepo.fePackages && monorepo.fePackages.length > 1) {
				throw new UserError(
					`Monorepo with ${monorepo.fePackages.length} FE packages detected: ${monorepo.fePackages.join(", ")}. Use --package to select one.`,
				)
			}
		}
	} catch (error) {
		if (repo.isTemporary) await repo.cleanup()
		throw error
	}

	return repo
}

function classifyInput(source: string): "local" | "github" {
	if (source.startsWith("https://github.com/") || source.startsWith("github:")) {
		return "github"
	}
	return "local"
}

async function resolveLocal(source: string): Promise<ResolvedRepo> {
	const absolutePath = resolve(process.cwd(), source)

	try {
		const s = await stat(absolutePath)
		if (!s.isDirectory()) {
			throw new UserError(
				`Not a directory: ${absolutePath}. Please specify a project root directory.`,
			)
		}
	} catch (error) {
		if (error instanceof UserError) throw error
		throw new UserError(
			`Path does not exist: ${absolutePath}. Please specify a valid project path.`,
		)
	}

	return {
		localPath: absolutePath,
		source,
		projectName: basename(absolutePath),
		isTemporary: false,
		cleanup: async () => {},
	}
}

async function resolveGitHub(source: string): Promise<ResolvedRepo> {
	const gigetSource = normalizeToGigetFormat(source)
	const tmpDir = join(tmpdir(), `ditto-${Date.now()}`)

	try {
		const { dir } = await downloadTemplate(gigetSource, {
			dir: tmpDir,
			force: true,
		})

		return {
			localPath: dir,
			source,
			projectName: extractRepoName(source),
			isTemporary: true,
			cleanup: async () => {
				await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
			},
		}
	} catch {
		throw new UserError(
			`Failed to download GitHub repo: ${source}. Check that the URL is correct and the repo is public.`,
		)
	}
}

function normalizeToGigetFormat(source: string): string {
	if (source.startsWith("github:")) return source
	// https://github.com/user/repo -> github:user/repo
	return source.replace("https://github.com/", "github:")
}

function extractRepoName(source: string): string {
	const parts = source.split("/")
	return parts[parts.length - 1]?.replace(".git", "") || "unknown"
}

interface MonorepoResult {
	isMonorepo: boolean
	selectedPackage?: string
	fePackages?: string[]
}

async function detectMonorepo(repoPath: string): Promise<MonorepoResult> {
	const rootPkgPath = join(repoPath, "package.json")
	let rootPkg: { workspaces?: string[] | { packages: string[] } }

	try {
		rootPkg = JSON.parse(await readFile(rootPkgPath, "utf-8"))
	} catch {
		return { isMonorepo: false }
	}

	const workspaces = Array.isArray(rootPkg.workspaces)
		? rootPkg.workspaces
		: rootPkg.workspaces?.packages

	if (!workspaces || workspaces.length === 0) {
		// Check for pnpm-workspace.yaml
		try {
			const pnpmWs = await readFile(join(repoPath, "pnpm-workspace.yaml"), "utf-8")
			if (!pnpmWs.includes("packages:")) return { isMonorepo: false }
			// pnpm-workspace.yaml exists with packages — treat as monorepo and continue scanning
		} catch {
			return { isMonorepo: false }
		}
	}

	// Find FE packages by scanning common workspace directories
	const fePackages: string[] = []
	const candidateDirs = ["apps", "packages", "libs"]

	for (const dir of candidateDirs) {
		const dirPath = join(repoPath, dir)
		try {
			await access(dirPath)
		} catch {
			continue
		}

		const entries = await readdir(dirPath, { withFileTypes: true })

		for (const entry of entries) {
			if (!entry.isDirectory()) continue
			const pkgJsonPath = join(dirPath, entry.name, "package.json")
			try {
				const pkgJson = JSON.parse(await readFile(pkgJsonPath, "utf-8"))
				const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }
				if (FE_INDICATORS.some((dep) => dep in allDeps)) {
					fePackages.push(join(dir, entry.name))
				}
			} catch {
				// skip unreadable packages
			}
		}
	}

	if (fePackages.length === 0) {
		return { isMonorepo: true }
	}

	if (fePackages.length === 1) {
		return { isMonorepo: true, selectedPackage: fePackages[0], fePackages }
	}

	return { isMonorepo: true, fePackages }
}
