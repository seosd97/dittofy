import type { ComponentCatalog, ComponentInfo } from "@domain/aspects/components/schema.js"
import type { InteractionPatterns } from "@domain/aspects/interactions/schema.js"
import type { LayoutSystem } from "@domain/aspects/layout/schema.js"
import type { PageStructures } from "@domain/aspects/pages/schema.js"
import type { ResponsiveStrategy } from "@domain/aspects/responsive/schema.js"
import type { DesignTokens } from "@domain/aspects/tokens/schema.js"
import type { TypographySystem } from "@domain/aspects/typography/schema.js"

// Re-export aspect types for convenience
export type {
	ComponentCatalog,
	ComponentInfo,
	DesignTokens,
	InteractionPatterns,
	LayoutSystem,
	PageStructures,
	ResponsiveStrategy,
	TypographySystem,
}

/**
 * Single source of truth: aspect name → analysis result type mapping.
 * Add one line here when adding a new aspect; AnalysisResult updates automatically.
 */
export interface AspectTypeMap {
	designTokens: DesignTokens
	typography: TypographySystem
	componentCatalog: ComponentCatalog
	layoutSystem: LayoutSystem
	pageStructures: PageStructures
	responsiveStrategy: ResponsiveStrategy
	interactionPatterns: InteractionPatterns
}

export type AspectName = keyof AspectTypeMap

export type AnalysisResultMap = {
	[K in AspectName]: AspectTypeMap[K] | null
}
