import type {
	ComponentCatalog,
	ComponentInfo,
	DesignTokens,
	InteractionPatterns,
	LayoutSystem,
	PageStructures,
	ResponsiveStrategy,
	TypographySystem,
} from "./aspect-map.js"
import type { Confident } from "./pipeline.js"
import type { ConsistencyMetrics, MaturityLevel, TokenValue } from "./schema-utils.js"

// ── Re-export shared types from schema-utils ──────────────

export type { ConsistencyMetrics, MaturityLevel, TokenValue }

// ── Re-export aspect types from aspect-map ────────────────

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

// ── Analysis Result Meta ──────────────────────────────────

export interface AnalysisResultMeta {
	version: 2
	analyzedAt: string
	source: string
	dittoVersion: string
	tier?: string
	duration: number
	monorepo?: { root: string; target: string }
}

// ── Analysis Result ───────────────────────────────────────

export interface AnalysisResult {
	techStack: TechStack
	designTokens: DesignTokens | null
	typography: TypographySystem | null
	componentCatalog: ComponentCatalog | null
	layoutSystem: LayoutSystem | null
	pageStructures: PageStructures | null
	responsiveStrategy: ResponsiveStrategy | null
	interactionPatterns: InteractionPatterns | null
	essence: DesignEssence
	/**
	 * Names of analyzers that failed (empty = all succeeded).
	 * Use this to distinguish "analyzer failed" (name in list, value is null)
	 * from "no relevant data found" (name NOT in list, value has empty arrays).
	 */
	failedAnalyzers: string[]
	meta?: AnalysisResultMeta
}

export interface TechStack {
	framework: Confident<string>
	language: Confident<string>
	styling: Confident<StylingInfo>
	uiLibrary?: Confident<string>
	stateManagement?: Confident<string>
	buildTool?: Confident<string>
}

export interface StylingInfo {
	approach: string
	tier: 1 | 2
}

export interface DesignEssence {
	summary: string
	designPhilosophy: string
	keyCharacteristics: string[]
	colorStrategy: string
	typographyStrategy: string
	layoutStrategy: string
	componentStrategy: string
	interactionStrategy: string
	appType: "marketing" | "dashboard" | "ecommerce" | "content" | "social" | "utility"
}
