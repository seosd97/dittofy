import { ASPECT_NAMES, ASPECT_REGISTRY } from "@aspects/registry.js"
import type { AnalysisResult } from "@defs/analysis.js"
import type { DocumentEntry, DocumentSet } from "@defs/documentation.js"
import type { TemplateContext } from "@defs/templates.js"
import { logger } from "@utils/logger.js"
import type { EnvironmentProfile } from "./resolve-environment.js"

export function assembleDocuments(
	analysis: AnalysisResult,
	env: EnvironmentProfile,
	language: "ko" | "en",
	outputDir: string,
): DocumentSet {
	const ctx: TemplateContext = {
		analysis,
		env,
		structure: env.structure,
		language,
	}

	const documents: DocumentEntry[] = []

	for (const name of ASPECT_NAMES) {
		const descriptor = ASPECT_REGISTRY[name]
		for (const doc of descriptor.planning.docs) {
			if (!doc.renderDoc) continue
			try {
				const content = doc.renderDoc(ctx)
				if (!content) continue
				documents.push({
					filename: doc.filename,
					title: doc.title,
					content,
					category: doc.category,
				})
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				logger.warn(`Doc template for ${name} (${doc.filename}) failed: ${message}`)
			}
		}
	}

	if (documents.length === 0) {
		logger.warn("All doc templates returned null — no documents generated")
	}

	return { documents, outputDir }
}
