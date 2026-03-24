import type { AnalysisResult } from "@defs/analysis.js"
import type { DocumentEntry, DocumentSet } from "@defs/documentation.js"
import type { TemplateContext } from "@defs/templates.js"
import { ASPECT_NAMES, ASPECT_REGISTRY } from "@domain/aspects/registry.js"
import type { EnvironmentProfile } from "@domain/rendering/resolve-environment.js"
import { logger } from "@infra/logger.js"

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

	validateDocumentSet(documents)

	return { documents, outputDir }
}

const CRITICAL_DOC_ASPECTS = ["designTokens", "typography"] as const

function validateDocumentSet(documents: DocumentEntry[]): void {
	const generatedFilenames = new Set(documents.map((d) => d.filename))

	for (const aspectName of CRITICAL_DOC_ASPECTS) {
		const descriptor = ASPECT_REGISTRY[aspectName]
		if (!descriptor?.planning?.docs) continue
		for (const doc of descriptor.planning.docs) {
			if (!generatedFilenames.has(doc.filename)) {
				logger.warn(`Critical documentation missing: ${doc.filename} (${aspectName})`)
			}
		}
	}
}
