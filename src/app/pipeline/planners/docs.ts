import type { AnalysisResult } from "@defs/analysis.js"
import type { DocumentPlan, DocumentPlanEntry } from "@defs/documentation.js"
import { ASPECT_NAMES, ASPECT_REGISTRY } from "@domain/aspects/registry.js"

export function planDocuments(analysis: AnalysisResult): DocumentPlan {
	const failed = new Set(analysis.failedAnalyzers)
	const coreDocuments: DocumentPlanEntry[] = []
	const dynamicDocuments: DocumentPlanEntry[] = []

	// Overview is always included (not aspect-driven)
	coreDocuments.push({
		filename: "00-overview.md",
		title: "Design Overview",
		reason: "Core document: project identity and design philosophy",
		include: true,
	})

	// Generate plan entries from aspect registry
	for (const name of ASPECT_NAMES) {
		const descriptor = ASPECT_REGISTRY[name]
		for (const doc of descriptor.planning.docs) {
			const isFailed = failed.has(name)
			const entry: DocumentPlanEntry = {
				filename: doc.filename,
				title: doc.title,
				reason: isFailed
					? `Skipped: ${name} analyzer failed`
					: `${doc.category === "core" ? "Core" : "Dynamic"} document: ${doc.title}`,
				include: !isFailed,
			}

			if (doc.category === "core") {
				coreDocuments.push(entry)
			} else {
				dynamicDocuments.push(entry)
			}
		}
	}

	return { coreDocuments, dynamicDocuments }
}
