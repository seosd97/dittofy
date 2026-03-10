import { join } from "node:path"
import type { DocumentSet } from "../../types/documentation.js"
import { logger } from "../../utils/logger.js"
import { ensureDir, writeFileContent } from "../../utils/fs.js"

export async function writeDocuments(docSet: DocumentSet): Promise<void> {
	await ensureDir(docSet.outputDir)

	const failures: string[] = []

	for (const doc of docSet.documents) {
		const filePath = join(docSet.outputDir, doc.filename)
		try {
			await writeFileContent(filePath, doc.content)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			failures.push(`${doc.filename}: ${message}`)
			logger.warn(`Failed to write document: ${doc.filename}`)
		}
	}

	if (failures.length > 0) {
		throw new Error(
			`Failed to write ${failures.length}/${docSet.documents.length} documents: ${failures.join("; ")}`,
		)
	}
}
