import { join } from "node:path"
import type { DocumentSet } from "@defs/documentation.js"
import { ensureDir, writeFileContent } from "@infra/fs.js"
import { logger } from "@infra/logger.js"

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

	const filenames = docSet.documents.map((d) => d.filename).join(", ")
	logger.info(`Generated ${docSet.documents.length} documents: ${filenames}`)
}
