import type { AnalysisResult } from "../../types/analysis.js"
import type { DocumentPlan, DocumentPlanEntry } from "../../types/documentation.js"

export function planDocuments(analysis: AnalysisResult): DocumentPlan {
	const failed = new Set(analysis.failedAnalyzers)

	const coreDocuments: DocumentPlanEntry[] = [
		{
			filename: "00-overview.md",
			title: "Design Overview",
			reason: "Core document: project identity and design philosophy",
			include: true,
		},
		{
			filename: "01-design-tokens.md",
			title: "Design Tokens",
			reason: failed.has("designTokens")
				? "Skipped: token analyzer failed"
				: "Core document: color, spacing, and other design tokens",
			include: !failed.has("designTokens"),
		},
		{
			filename: "02-typography.md",
			title: "Typography",
			reason: failed.has("typography")
				? "Skipped: typography analyzer failed"
				: "Core document: font families, type scale, and typography principles",
			include: !failed.has("typography"),
		},
		{
			filename: "03-component-catalog.md",
			title: "Component Catalog",
			reason: failed.has("componentCatalog")
				? "Skipped: component analyzer failed"
				: "Core document: component inventory and patterns",
			include: !failed.has("componentCatalog"),
		},
		{
			filename: "04-layout-system.md",
			title: "Layout System",
			reason: failed.has("layoutSystem")
				? "Skipped: layout analyzer failed"
				: "Core document: grid, containers, and navigation patterns",
			include: !failed.has("layoutSystem"),
		},
	]

	const dynamicDocuments: DocumentPlanEntry[] = [
		{
			filename: "05-page-structures.md",
			title: "Page Structures",
			reason: failed.has("pageStructures") ? "Skipped: page analyzer failed" : "Pages found in the project",
			include: !failed.has("pageStructures") && (analysis.pageStructures?.pages.length ?? 0) > 0,
		},
		{
			filename: "06-responsive-strategy.md",
			title: "Responsive Strategy",
			reason: failed.has("responsiveStrategy") ? "Skipped: responsive analyzer failed" : "Responsive patterns found in the project",
			include:
				!failed.has("responsiveStrategy") &&
				((analysis.responsiveStrategy?.breakpoints.length ?? 0) > 0 ||
				(analysis.responsiveStrategy?.patterns.length ?? 0) > 0),
		},
		{
			filename: "07-interactions.md",
			title: "Interactions",
			reason: failed.has("interactionPatterns") ? "Skipped: interaction analyzer failed" : "Interaction patterns found in the project",
			include:
				!failed.has("interactionPatterns") &&
				((analysis.interactionPatterns?.animations.length ?? 0) > 0 ||
				(analysis.interactionPatterns?.transitions.length ?? 0) > 0 ||
				(analysis.interactionPatterns?.gestures.length ?? 0) > 0),
		},
	]

	return { coreDocuments, dynamicDocuments }
}
