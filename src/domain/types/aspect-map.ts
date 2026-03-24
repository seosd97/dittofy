import type {
	ComponentCatalog,
	DesignTokens,
	InteractionPatterns,
	LayoutSystem,
	PageStructures,
	ResponsiveStrategy,
	TypographySystem,
} from "./analysis.js"

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
