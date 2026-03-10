import type { LanguageModel } from "ai"
import type { UsageTracker } from "../../llm/usage.js"
import type { AnalysisResult } from "../../types/analysis.js"
import type { DocumentEntry, DocumentSet } from "../../types/documentation.js"
import type { PhaseError, PhaseResult } from "../../types/pipeline.js"
import { logger, phaseFail, phaseStart, phaseSuccess } from "../../utils/logger.js"
import { planDocuments } from "./doc-planner.js"
import { generateComponentsDoc } from "./generators/components-gen.js"
import { generateInteractionsDoc } from "./generators/interactions-gen.js"
import { generateLayoutDoc } from "./generators/layout-gen.js"
import { generateOverviewDoc } from "./generators/overview-gen.js"
import { generatePagesDoc } from "./generators/pages-gen.js"
import { generateResponsiveDoc } from "./generators/responsive-gen.js"
import { generateTokensDoc } from "./generators/tokens-gen.js"
import { generateTypographyDoc } from "./generators/typography-gen.js"
import { writeDocuments } from "./writer.js"

export async function runDocumentation(
	analysis: AnalysisResult,
	model: LanguageModel,
	usage: UsageTracker,
	outputDir: string,
	language: "ko" | "en",
): Promise<PhaseResult<DocumentSet>> {
	const startTime = Date.now()
	const errors: PhaseError[] = []

	phaseStart("Phase 3", "Generating documentation")

	// 1. Plan documents
	const plan = planDocuments(analysis)
	const totalPlanned =
		plan.coreDocuments.length + plan.dynamicDocuments.filter((d) => d.include).length

	logger.info(`Planned ${totalPlanned} documents`)

	if (analysis.failedAnalyzers.length > 0) {
		logger.warn(
			`Documentation: ${analysis.failedAnalyzers.length} analyzers failed (${analysis.failedAnalyzers.join(", ")}). Some documents may be skipped.`,
		)
	}

	// 2. Generate each document
	const documents: DocumentEntry[] = []

	// Helper to wrap generator calls with error handling
	async function tryGenerate(
		generatorName: string,
		generate: () => Promise<DocumentEntry>,
	): Promise<void> {
		try {
			const doc = await generate()
			documents.push(doc)
			logger.debug(`Generated: ${doc.filename}`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			errors.push({ phase: generatorName, message, cause: error })
			logger.warn(`Failed to generate ${generatorName}: ${message}`)
		}
	}

	// Core documents (always generated)
	await tryGenerate("overview-gen", () =>
		generateOverviewDoc(analysis.techStack, analysis.essence, model, usage, language),
	)

	if (analysis.designTokens) {
		await tryGenerate("tokens-gen", () =>
			generateTokensDoc(analysis.designTokens!, analysis.essence, model, usage, language),
		)
	}

	if (analysis.typography) {
		await tryGenerate("typography-gen", () =>
			generateTypographyDoc(analysis.typography!, analysis.essence, model, usage, language),
		)
	}

	if (analysis.componentCatalog) {
		await tryGenerate("components-gen", () =>
			generateComponentsDoc(
				analysis.componentCatalog!,
				analysis.essence,
				model,
				usage,
				language,
			),
		)
	}

	if (analysis.layoutSystem) {
		await tryGenerate("layout-gen", () =>
			generateLayoutDoc(analysis.layoutSystem!, analysis.essence, model, usage, language),
		)
	}

	// Dynamic documents (conditionally generated)
	const pagesEntry = plan.dynamicDocuments.find((d) => d.filename === "05-page-structures.md")
	if (pagesEntry?.include && analysis.pageStructures) {
		await tryGenerate("pages-gen", () =>
			generatePagesDoc(analysis.pageStructures!, analysis.essence, model, usage, language),
		)
	}

	const responsiveEntry = plan.dynamicDocuments.find(
		(d) => d.filename === "06-responsive-strategy.md",
	)
	if (responsiveEntry?.include && analysis.responsiveStrategy) {
		await tryGenerate("responsive-gen", () =>
			generateResponsiveDoc(
				analysis.responsiveStrategy!,
				analysis.essence,
				model,
				usage,
				language,
			),
		)
	}

	const interactionsEntry = plan.dynamicDocuments.find((d) => d.filename === "07-interactions.md")
	if (interactionsEntry?.include && analysis.interactionPatterns) {
		await tryGenerate("interactions-gen", () =>
			generateInteractionsDoc(
				analysis.interactionPatterns!,
				analysis.essence,
				model,
				usage,
				language,
			),
		)
	}

	// 3. Write to disk
	const docSet: DocumentSet = { documents, outputDir }
	await writeDocuments(docSet)

	if (documents.length === 0) {
		phaseFail("Phase 3", "All document generators failed")
		return { status: "failed", errors, duration: Date.now() - startTime }
	}

	const status = errors.length > 0 ? "partial" : "completed"
	phaseSuccess("Phase 3", `Generated ${documents.length}/${totalPlanned} documents (${status})`)

	return {
		status,
		data: docSet,
		errors,
		duration: Date.now() - startTime,
	}
}
