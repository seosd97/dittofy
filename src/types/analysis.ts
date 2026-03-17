import type { ConfidenceLevel, Confident } from "./pipeline.js"

// ── Shared Types ──────────────────────────────────────────

export type MaturityLevel = "nascent" | "developing" | "mature" | "comprehensive"

export interface ConsistencyMetrics {
	score: number
	strengths: string[]
	issues: string[]
	maturity: MaturityLevel
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
	/** v2: 색상 토큰을 시맨틱 그룹별로 분류 */
	colorGroups?: ColorTokenGroup[]
	/** v2: 모션/트랜지션 토큰 (duration, easing) */
	motion?: MotionToken[]
	/** v2: 토큰 사용처 매핑 */
	tokenUsage?: TokenUsageRef[]
	/** v2: 일관성 평가 */
	consistency?: ConsistencyMetrics
}

export interface ColorTokenGroup {
	group: string
	level?: "primitive" | "semantic"
	tokens: ColorToken[]
}

export interface MotionToken {
	name: string
	duration: string
	easing: string
	usage: string
	confidence: ConfidenceLevel
}

export interface TokenUsageRef {
	tokenName: string
	usedIn: string[]
	frequency: "high" | "medium" | "low"
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
	/** v2: 상세 폰트 패밀리 정의 */
	fontFamilyDefs?: FontFamilyDef[]
	/** v2: 자간 토큰 */
	letterSpacings?: LetterSpacing[]
	/** v2: 반응형 폰트 스케일링 */
	responsiveScaling?: ResponsiveFontScale[]
	/** v2: 일관성 평가 */
	consistency?: ConsistencyMetrics
}

export interface FontFamilyDef {
	name: string
	category: "sans-serif" | "serif" | "monospace" | "display"
	fallbackStack: string
	usage: string
	confidence: ConfidenceLevel
}

export interface LetterSpacing {
	name: string
	value: string
	usage: string
	confidence: ConfidenceLevel
}

export interface ResponsiveFontScale {
	breakpoint: string
	scaleFactor: number
	description: string
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
	/** v2: 일관성 평가 */
	consistency?: ConsistencyMetrics
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
	/** v2: 상세 variant 스펙 */
	variantSpecs?: VariantSpec[]
	/** v2: 컴포넌트 상태 (hover, active, disabled 등) */
	states?: ComponentState[]
	/** v2: 사이즈 스펙 */
	sizes?: SizeSpec[]
	/** v2: 접근성 정보 */
	accessibility?: AccessibilityInfo
	/** v2: 사용하는 토큰 바인딩 */
	tokenBindings?: ComponentTokenBinding[]
}

export interface VariantSpec {
	name: string
	description: string
	visualDiff?: string
}

export interface ComponentState {
	name: "default" | "hover" | "active" | "focus" | "disabled" | "loading" | "error"
	description: string
}

export interface SizeSpec {
	name: string
	dimensions?: string
}

export interface AccessibilityInfo {
	role?: string
	keyboardInteraction?: string
	screenReaderNotes?: string
}

export interface ComponentTokenBinding {
	tokenCategory: string
	tokenNames: string[]
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
	/** v2: 스페이싱 리듬 */
	spacingRhythm?: SpacingRhythm[]
	/** v2: 일관성 평가 */
	consistency?: ConsistencyMetrics
}

export interface SpacingRhythm {
	name: string
	value: string
	usage: string
}

export interface LayoutContainer {
	name: string
	maxWidth?: string
	padding?: string
	confidence: ConfidenceLevel
	/** v2: breakpoint별 오버라이드 */
	responsiveOverrides?: BreakpointOverride[]
}

export interface BreakpointOverride {
	breakpoint: string
	maxWidth?: string
	padding?: string
	columns?: number
	gap?: string
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
	/** v2: 추상화된 페이지 패턴 */
	patterns?: PagePattern[]
	/** v2: 일관성 평가 */
	consistency?: ConsistencyMetrics
}

export interface PagePattern {
	name: string
	description: string
	sectionFlow: string[]
	confidence: ConfidenceLevel
}

export interface PageInfo {
	name: string
	route: string
	layout: string
	sections: string[]
	components: string[]
	confidence: ConfidenceLevel
	/** v2: 상세 섹션 정보 */
	sectionDetails?: SectionInfo[]
}

export interface SectionInfo {
	name: string
	hierarchyWeight?: "primary" | "secondary" | "tertiary"
	flowRelation?: "hero" | "content" | "cta" | "footer" | "sidebar" | "auxiliary"
	components?: string[]
}

export interface ResponsiveStrategy {
	approach: Confident<string>
	breakpoints: BreakpointInfo[]
	patterns: ResponsivePattern[]
	/** v2: 컴포넌트별 적응 전략 */
	componentAdaptations?: ComponentAdaptation[]
	/** v2: 레이아웃 적응 전략 */
	layoutAdaptations?: LayoutAdaptation[]
	/** v2: 일관성 평가 */
	consistency?: ConsistencyMetrics
}

export interface ComponentAdaptation {
	component: string
	breakpoint: string
	adaptation: string
	confidence: ConfidenceLevel
}

export interface LayoutAdaptation {
	layoutElement: string
	breakpoint: string
	behavior: string
	confidence: ConfidenceLevel
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
	/** v2: 상태 전이 코레오그래피 */
	choreography?: StateChoreography[]
	/** v2: 일관성 평가 */
	consistency?: ConsistencyMetrics
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
	confidence: ConfidenceLevel
	/** v2: 애니메이션 타이밍 */
	duration?: string
	easing?: string
	/** v2: 트리거 컨텍스트 */
	trigger?: string
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
	/** v2: 트리거 요소 */
	triggerElement?: string
	/** v2: 피드백 유형 */
	feedbackType?: string
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
