import { join } from "node:path"
import type { PromptSet } from "@defs/prompts.js"
import { ensureDir, writeFileContent } from "@utils/fs.js"
import { logger } from "@utils/logger.js"

export async function writePrompts(promptSet: PromptSet): Promise<void> {
	await ensureDir(promptSet.outputDir)

	const failures: string[] = []

	for (const step of promptSet.steps) {
		const filePath = join(promptSet.outputDir, step.filename)
		try {
			await writeFileContent(filePath, step.content)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			failures.push(`${step.filename}: ${message}`)
			logger.warn(`Failed to write prompt: ${step.filename}`)
		}
	}

	const readmePath = join(promptSet.outputDir, "README.md")
	try {
		await writeFileContent(readmePath, promptSet.readme)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		failures.push(`README.md: ${message}`)
		logger.warn(`Failed to write README: ${message}`)
	}

	if (failures.length > 0) {
		throw new Error(`Failed to write ${failures.length} prompt files: ${failures.join("; ")}`)
	}
}
