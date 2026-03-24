import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { isDebugMode, logger } from "@infra/logger.js"

export interface Workspace {
	readonly tmpDir: string
	writeMarkdown(filename: string, content: string): Promise<void>
	writeJSON(filename: string, data: unknown): Promise<void>
	readMarkdown(filename: string): Promise<string>
	readJSON<T>(filename: string): Promise<T>
	exists(filename: string): Promise<boolean>
	cleanup(): Promise<void>
}

export async function createWorkspace(outputDir: string): Promise<Workspace> {
	const tmpDir = resolve(outputDir, ".tmp")
	await mkdir(tmpDir, { recursive: true })

	return {
		tmpDir,

		async writeMarkdown(filename: string, content: string) {
			await writeFile(join(tmpDir, filename), content, "utf-8")
		},

		async writeJSON(filename: string, data: unknown) {
			await writeFile(join(tmpDir, filename), JSON.stringify(data, null, 2), "utf-8")
		},

		async readMarkdown(filename: string) {
			return await readFile(join(tmpDir, filename), "utf-8")
		},

		async readJSON<T>(filename: string): Promise<T> {
			const content = await readFile(join(tmpDir, filename), "utf-8")
			return JSON.parse(content) as T
		},

		async exists(filename: string) {
			try {
				await readFile(join(tmpDir, filename))
				return true
			} catch {
				return false
			}
		},

		async cleanup() {
			if (isDebugMode()) {
				logger.info(`Debug mode: workspace preserved at ${tmpDir}`)
				return
			}
			await rm(tmpDir, { recursive: true, force: true })
		},
	}
}
