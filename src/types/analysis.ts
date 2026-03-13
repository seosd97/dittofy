import type { ConfidenceLevel, Confident } from "./pipeline.js"

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

export interface DesignTokens {
	colors: ColorToken[]
	spacing: SpacingToken[]
	borderRadius: TokenValue[]
	shadows: TokenValue[]
	breakpoints: TokenValue[]
	zIndex: TokenValue[]
}

export interface ColorToken {
	name: string
	value: string
	usage: string
	confidence: ConfidenceLevel
}

export interface SpacingToken {
	name: string
	value: string
	usage: string
	confidence: ConfidenceLevel
}

export interface TokenValue {
	name: string
	value: string
	confidence: ConfidenceLevel
}

export interface TypographySystem {
	fontFamilies: Confident<string[]>
	scale: TypographyScale[]
	lineHeights: TokenValue[]
	fontWeights: TokenValue[]
}

export interface TypographyScale {
	name: string
	fontSize: string
	lineHeight?: string
	fontWeight?: string
	usage: string
	confidence: ConfidenceLevel
}

export interface ComponentCatalog {
	components: ComponentInfo[]
	patterns: ComponentPattern[]
}

export interface ComponentInfo {
	name: string
	filePath: string
	category: "atom" | "molecule" | "organism" | "template"
	tier: "core" | "design-system" | "domain"
	props: PropInfo[]
	variants: string[]
	description: string
	confidence: ConfidenceLevel
}

export interface PropInfo {
	name: string
	type: string
	required: boolean
	defaultValue?: string
}

export interface ComponentPattern {
	name: string
	description: string
	components: string[]
	confidence: ConfidenceLevel
}

export interface LayoutSystem {
	approach: Confident<string>
	containers: LayoutContainer[]
	grids: GridSystem[]
	navigation: NavigationPattern[]
}

export interface LayoutContainer {
	name: string
	maxWidth?: string
	padding?: string
	confidence: ConfidenceLevel
}

export interface GridSystem {
	type: "css-grid" | "flexbox" | "both"
	columns?: number
	gap?: string
	confidence: ConfidenceLevel
}

export interface NavigationPattern {
	type: string
	description: string
	confidence: ConfidenceLevel
}

export interface PageStructures {
	pages: PageInfo[]
}

export interface PageInfo {
	name: string
	route: string
	layout: string
	sections: string[]
	components: string[]
	confidence: ConfidenceLevel
}

export interface ResponsiveStrategy {
	approach: Confident<string>
	breakpoints: BreakpointInfo[]
	patterns: ResponsivePattern[]
}

export interface BreakpointInfo {
	name: string
	value: string
	confidence: ConfidenceLevel
}

export interface ResponsivePattern {
	name: string
	description: string
	breakpoint: string
	confidence: ConfidenceLevel
}

export interface InteractionPatterns {
	animations: AnimationInfo[]
	transitions: TransitionInfo[]
	gestures: GestureInfo[]
}

export interface AnimationInfo {
	name: string
	type: string
	description: string
	confidence: ConfidenceLevel
}

export interface TransitionInfo {
	property: string
	duration: string
	easing: string
	confidence: ConfidenceLevel
}

export interface GestureInfo {
	type: string
	description: string
	confidence: ConfidenceLevel
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
}
