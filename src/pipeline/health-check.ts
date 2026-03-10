import { access } from "node:fs/promises"
import { resolve } from "node:path"
import type { HealthCheck, HealthCheckResult } from "../types/pipeline.js"

export async function runHealthCheck(repoPath: string): Promise<HealthCheckResult> {
	const checks: HealthCheck[] = []

	checks.push(await checkPackageJson(repoPath))
	checks.push(await checkSourceFiles(repoPath))

	const hasFailure = checks.some((c) => c.status === "fail")
	const hasWarning = checks.some((c) => c.status === "warn")

	return {
		status: hasFailure ? "fail" : hasWarning ? "warn" : "pass",
		checks,
	}
}

async function checkPackageJson(repoPath: string): Promise<HealthCheck> {
	try {
		await access(resolve(repoPath, "package.json"))
		return { name: "package.json", status: "pass", message: "Found" }
	} catch {
		return { name: "package.json", status: "fail", message: "Not found — not a valid FE project" }
	}
}

async function checkSourceFiles(repoPath: string): Promise<HealthCheck> {
	try {
		const srcPath = resolve(repoPath, "src")
		await access(srcPath)
		return { name: "src directory", status: "pass", message: "Found" }
	} catch {
		return {
			name: "src directory",
			status: "warn",
			message: "No src/ directory — will scan root for source files",
		}
	}
}
