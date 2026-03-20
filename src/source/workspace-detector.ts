import { access, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

/**
 * Walk up from targetPath to find monorepo root.
 * Root = directory with package.json containing "workspaces" field or pnpm-workspace.yaml.
 * Returns null if not a monorepo (single project).
 */
export async function findMonorepoRoot(targetPath: string): Promise<string | null> {
	let current = resolve(targetPath)
	const systemRoot = resolve("/")

	while (current !== systemRoot) {
		const parent = dirname(current)
		if (parent === current) break
		// Don't check targetPath itself — only parents

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
