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
 * 단일 진실 원천: aspect 이름 → 분석 결과 타입 매핑.
 * 새 aspect 추가 시 여기에 한 줄 추가하면 AnalysisResult에 자동 반영.
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
