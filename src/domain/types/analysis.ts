import type { Confident } from "./pipeline.js"

// ── Shared Types ──────────────────────────────────────────

export type MaturityLevel = "nascent" | "developing" | "mature" | "comprehensive"

export interface ConsistencyMetrics {
	score: number
	strengths: string[]
	issues: string[]
	maturity: MaturityLevel
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

export interface DesignTokens {
	spacing: SpacingToken[]
	borderRadius: TokenValue[]
	shadows: TokenValue[]
	breakpoints: TokenValue[]
	zIndex: TokenValue[]
	colorGroups?: ColorTokenGroup[] | null
	motion?: MotionToken[] | null
	themeVariants?: ThemeVariant[] | null
	defaultTheme?: string | null
	consistency?: ConsistencyMetrics | null
	designNotes?: { observations: string[]; anomalies?: string[] } | null
}

export interface ColorTokenGroup {
	group: string
	level?: "primitive" | "semantic" | null
	tokens: ColorToken[]
}

export interface MotionToken {
	name: string
	duration: string
	easing: string
	usage: string
}

export interface ThemeVariant {
	name: string
	colorOverrides: {
		tokenName: string
		value: string
		derivation?: "inverted" | "shifted" | "preserved" | "custom" | null
	}[]
	surfaceStrategy: string
}

export interface ColorToken {
	name: string
	value: string
	usage: string
}

export interface SpacingToken {
	name: string
	value: string
	usage: string
}

export interface TokenValue {
	name: string
	value: string
}

export interface TypographySystem {
	fontFamilies: string[]
	scale: TypographyScale[]
	lineHeights: TokenValue[]
	fontWeights: TokenValue[]
	fontFamilyDefs?: FontFamilyDef[] | null
	letterSpacings?: LetterSpacing[] | null
	responsiveScaling?: ResponsiveFontScale[] | null
	consistency?: ConsistencyMetrics | null
	designNotes?: { observations: string[]; anomalies?: string[] } | null
}

export interface FontFamilyDef {
	name: string
	category: "sans-serif" | "serif" | "monospace" | "display"
	fallbackStack: string
	usage: string
}

export interface LetterSpacing {
	name: string
	value: string
	usage: string
}

export interface ResponsiveFontScale {
	breakpoint: string
	scaleFactor: number
	description: string
}

export interface TypographyScale {
	name: string
	fontSize: string
	lineHeight?: string | null
	fontWeight?: string | null
	usage: string
}

export interface ComponentCatalog {
	components: ComponentInfo[]
	patterns: ComponentPattern[]
	consistency?: ConsistencyMetrics | null
	designNotes?: { observations: string[]; anomalies?: string[] } | null
}

export interface ComponentInfo {
	name: string
	category: "atom" | "molecule" | "organism" | "template"
	tier: "core" | "design-system" | "domain"
	variants: string[]
	description: string
	variantSpecs?: VariantSpec[] | null
	states?: ComponentState[] | null
	sizes?: string[] | null
	accessibility?: AccessibilityInfo | null
}

export interface VariantSpec {
	name: string
	description: string
	visualDiff?: string | null
}

export interface ComponentState {
	name: string
	description: string
}

export interface AccessibilityInfo {
	role?: string | null
	keyboardInteraction?: string | null
	screenReaderNotes?: string | null
}

export interface ComponentPattern {
	name: string
	description: string
	components: string[]
}

export interface LayoutSystem {
	approach: string
	containers: LayoutContainer[]
	grids: GridSystem[]
	navigation: NavigationPattern[]
	spacingRhythm?: SpacingRhythm[] | null
	consistency?: ConsistencyMetrics | null
	designNotes?: { observations: string[]; anomalies?: string[] } | null
}

export interface SpacingRhythm {
	name: string
	value: string
	usage: string
}

export interface LayoutContainer {
	name: string
	maxWidth?: string | null
	padding?: string | null
	responsiveOverrides?: BreakpointOverride[] | null
}

export interface BreakpointOverride {
	breakpoint: string
	maxWidth?: string | null
	padding?: string | null
	columns?: number | null
	gap?: string | null
}

export interface GridSystem {
	type: "css-grid" | "flexbox" | "both"
	columns?: number | null
	gap?: string | null
}

export interface NavigationPattern {
	type: string
	description: string
}

export interface PageStructures {
	pages: PageInfo[]
	patterns?: PagePattern[] | null
	consistency?: ConsistencyMetrics | null
	designNotes?: { observations: string[]; anomalies?: string[] } | null
}

export interface PagePattern {
	name: string
	description: string
	sectionFlow: string[]
}

export interface PageInfo {
	name: string
	route: string
	layout: string
	sections: string[]
	components: string[]
}

export interface ResponsiveStrategy {
	approach?: string | null
	breakpoints: BreakpointInfo[]
	patterns: ResponsivePattern[]
	componentAdaptations?: ComponentAdaptation[] | null
	layoutAdaptations?: LayoutAdaptation[] | null
	consistency?: ConsistencyMetrics | null
	designNotes?: { observations: string[]; anomalies?: string[] } | null
}

export interface ComponentAdaptation {
	component: string
	breakpoint: string
	adaptation: string
}

export interface LayoutAdaptation {
	layoutElement: string
	breakpoint: string
	behavior: string
}

export interface BreakpointInfo {
	name: string
	value: string
}

export interface ResponsivePattern {
	name: string
	description: string
	breakpoint: string
}

export interface InteractionPatterns {
	animations: AnimationInfo[]
	transitions: TransitionInfo[]
	gestures: GestureInfo[]
	choreography?: StateChoreography[] | null
	consistency?: ConsistencyMetrics | null
	designNotes?: { observations: string[]; anomalies?: string[] } | null
}

export interface StateChoreography {
	name: string
	steps: string[]
	description: string
}

export interface AnimationInfo {
	name: string
	type: string
	description: string
	duration?: string | null
	easing?: string | null
	trigger?: string | null
}

export interface TransitionInfo {
	property: string
	duration: string
	easing: string
}

export interface GestureInfo {
	type: string
	description: string
	triggerElement?: string | null
	feedbackType?: string | null
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
