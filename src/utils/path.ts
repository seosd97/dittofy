import { basename, resolve } from "node:path"

export function resolveOutputDir(outputBase: string, projectName: string): string {
	return resolve(outputBase, projectName)
}

export function extractProjectName(source: string): string {
	if (source.includes("github.com")) {
		const parts = source.split("/")
		return parts[parts.length - 1]?.replace(".git", "") || "unknown"
	}
	return basename(resolve(source))
}
