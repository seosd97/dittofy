import { access, readFile, readdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"

/** Framework dependencies that indicate a frontend package */
export const FE_INDICATORS = [
	"react",
	"react-dom",
	"next",
	"vue",
	"nuxt",
	"svelte",
	"@sveltejs/kit",
	"astro",
	"@angular/core",
] as const

/** Minimal package.json shape for workspace detection */
interface PackageJson {
	name?: string
	workspaces?: unknown
	scripts?: Record<string, unknown>
	dependencies?: Record<string, unknown>
	devDependencies?: Record<string, unknown>
}

/** Maximum directory walk-up iterations to prevent infinite loops */
const MAX_WALKUP = 20

/**
 * Walk up from targetPath to find monorepo root.
 * Root = directory with package.json containing "workspaces" field or pnpm-workspace.yaml.
 * Returns null if not a monorepo (single project).
 */
export async function findMonorepoRoot(targetPath: string): Promise<string | null> {
	let current = resolve(targetPath)
	const systemRoot = resolve("/")

	let iterations = 0
	while (current !== systemRoot && iterations < MAX_WALKUP) {
		iterations++
		const parent = dirname(current)
		if (parent === current) break

		try {
			const pkgContent = await readFile(resolve(parent, "package.json"), "utf-8")
			const pkg = JSON.parse(pkgContent)
			if (pkg.workspaces || Array.isArray(pkg.workspaces)) return parent
		} catch {}

		try {
			await access(resolve(parent, "pnpm-workspace.yaml"))
			return parent
		} catch {}

		current = parent
	}

	return null
}

/**
 * Resolve workspace dependencies from target's package.json.
 * Returns relative paths (from rootPath) of depended workspace packages.
 */
export async function resolveWorkspaceDeps(
	targetPath: string,
	rootPath: string,
): Promise<string[]> {
	// 1. Read target's package.json
	const targetPkg = await readPackageJson(targetPath)
	if (!targetPkg) return []

	// 2. Find workspace:* deps
	const allDeps = { ...targetPkg.dependencies, ...targetPkg.devDependencies }
	const workspaceDeps = Object.entries(allDeps)
		.filter(([_, version]) => typeof version === "string" && version.startsWith("workspace:"))
		.map(([name]) => name)

	if (workspaceDeps.length === 0) return []

	// 3. Build a map of package name -> relative path by scanning workspace packages
	const packageMap = await buildWorkspacePackageMap(rootPath)

	// 4. Resolve dep names to paths
	const resolved: string[] = []
	for (const depName of workspaceDeps) {
		const pkgPath = packageMap.get(depName)
		if (pkgPath) {
			resolved.push(pkgPath)
		}
	}

	return resolved
}

/**
 * Detect multiple apps in a monorepo.
 * Returns app paths relative to root.
 */
export async function detectApps(rootPath: string): Promise<string[]> {
	const apps: string[] = []
	const appDirs = ["apps", "packages"]

	for (const dir of appDirs) {
		const dirPath = resolve(rootPath, dir)
		try {
			const entries = await readdir(dirPath, { withFileTypes: true })
			for (const entry of entries) {
				if (!entry.isDirectory()) continue
				const pkg = await readPackageJson(resolve(dirPath, entry.name))
				if (!pkg) continue
				// An "app" typically has dev/start scripts or framework deps
				const hasAppScript = pkg.scripts?.dev || pkg.scripts?.start || pkg.scripts?.build
				const hasFramework = FE_INDICATORS.some(
					(fw) => fw in (pkg.dependencies ?? {}) || fw in (pkg.devDependencies ?? {}),
				)
				if (hasAppScript && hasFramework) {
					apps.push(`${dir}/${entry.name}`)
				}
			}
		} catch {
			// Directory doesn't exist
		}
	}

	return apps
}

async function readPackageJson(dirPath: string): Promise<PackageJson | null> {
	try {
		const content = await readFile(resolve(dirPath, "package.json"), "utf-8")
		return JSON.parse(content) as PackageJson
	} catch {
		return null
	}
}

/**
 * Scan all workspace packages and build a map: package name -> relative path from root.
 * Looks in common locations: packages/*, apps/*, libs/*, modules/*
 */
async function buildWorkspacePackageMap(rootPath: string): Promise<Map<string, string>> {
	const map = new Map<string, string>()
	const dirs = ["packages", "apps", "libs", "modules"]

	for (const dir of dirs) {
		const dirPath = resolve(rootPath, dir)
		try {
			const entries = await readdir(dirPath, { withFileTypes: true })
			for (const entry of entries) {
				if (!entry.isDirectory()) continue
				const pkg = await readPackageJson(resolve(dirPath, entry.name))
				if (pkg?.name) {
					map.set(pkg.name, `${dir}/${entry.name}`)
				}
			}
		} catch {
			// Directory doesn't exist
		}
	}

	return map
}
