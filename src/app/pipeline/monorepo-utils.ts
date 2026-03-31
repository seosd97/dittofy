import { relative } from "node:path"
import { logger } from "@infra/logger.js"
import {
	detectApps,
	findMonorepoRoot,
	resolveWorkspaceDeps,
} from "@infra/source/workspace-detector.js"

export interface MonorepoInfo {
	rootPath: string
	targetRelative: string
	depPaths: string[]
}

export interface MonorepoDetectResult {
	info: MonorepoInfo | null
	error?: { phase: string; message: string }
}

/**
 * Detect monorepo structure for the given local path.
 * Returns info if monorepo detected, null otherwise.
 * When failOnMultipleApps is true and root-level has multiple apps, returns an error.
 */
export async function detectMonorepo(
	localPath: string,
	options?: { failOnMultipleApps?: boolean },
): Promise<MonorepoDetectResult> {
	const monorepoRoot = await findMonorepoRoot(localPath)
	if (!monorepoRoot) return { info: null }

	const targetRelative = relative(monorepoRoot, localPath)

	logger.info(`Monorepo detected: root=${monorepoRoot}`)
	logger.info(`Target: ${targetRelative}`)

	if (options?.failOnMultipleApps && (targetRelative === "" || targetRelative === ".")) {
		const apps = await detectApps(monorepoRoot)
		if (apps.length > 1) {
			const appList = apps.map((a) => `  - ${a}`).join("\n")
			return {
				info: null,
				error: {
					phase: "Phase 1",
					message: `Multiple apps detected in monorepo. Please specify one:\n${appList}`,
				},
			}
		}
	}

	const depPaths = await resolveWorkspaceDeps(localPath, monorepoRoot)
	if (depPaths.length > 0) {
		logger.info(`Monorepo: workspace deps = ${depPaths.join(", ")}`)
	}

	return { info: { rootPath: monorepoRoot, targetRelative, depPaths } }
}
