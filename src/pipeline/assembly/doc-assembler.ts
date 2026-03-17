import { ASPECT_NAMES } from "@aspects/registry.js"
import type { AspectName } from "@defs/aspect-map.js"
import type { DocumentEntry, DocumentSet } from "@defs/documentation.js"
import type { AnalysisResult } from "@defs/analysis.js"
import type { TemplateContext } from "@defs/templates.js"
import { logger } from "@utils/logger.js"
import type { EnvironmentProfile } from "./resolve-environment.js"
import { DOC_TEMPLATES } from "./doc-templates/index.js"

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
		const entry = DOC_TEMPLATES[name as AspectName]
		if (!entry) continue
		try {
			const content = entry.template(ctx)
			if (!content) continue
			documents.push({
				filename: entry.filename,
				title: entry.title,
				content,
				category: entry.category,
			})
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			logger.warn(`Doc template for ${name} failed: ${message}`)
		}
	}

	if (documents.length === 0) {
		logger.warn("All doc templates returned null — no documents generated")
	}

	return { documents, outputDir }
}
