# 03. Type Definitions — 핵심 타입 정의

Ditto 시스템 전체에서 사용되는 TypeScript 인터페이스와 타입을 정의한다.
이 문서는 파이프라인의 입력/출력, 분석 결과(analysis.json 스키마), 문서/프롬프트 생성, CLI 옵션 등 모든 핵심 계약(contract)을 포함한다.

> **원칙**: 모든 분석 항목에는 `confidenceLevel` 필드를 포함하여 추출 신뢰도를 명시한다.
> Zod 스키마와 1:1 매핑되도록 설계하며, `generateObject()` structured output에 직접 사용된다.

---

## 1. 공통 타입 (Common Types)

시스템 전반에서 재사용되는 기본 타입.

```typescript
// ─── Confidence Level ───────────────────────────────────────────
/**
 * 분석 항목의 신뢰도 수준.
 * - high: 명시적 정의(tailwind.config, CSS Variables 등)에서 직접 추출
 * - medium: 코드 패턴에서 유추, 대체로 신뢰 가능
 * - low: 정보 부족으로 LLM이 추론, 수동 검증 권장
 */
type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * 신뢰도가 부여된 값을 감싸는 제네릭 래퍼.
 * 개별 분석 항목에 confidence를 부여할 때 사용.
 */
interface Confident<T> {
  value: T
  confidenceLevel: ConfidenceLevel
  /** confidence가 low일 때 추론 근거 또는 검증 안내 */
  note?: string
}

// ─── Tech Stack ─────────────────────────────────────────────────
/** 레퍼런스 프로젝트의 기술 스택 감지 결과 */
interface TechStack {
  /** React, Next.js, Vite, Astro, Svelte, Vue 등 */
  framework: Confident<string>
  /** 프레임워크 버전 (감지 가능한 경우) */
  frameworkVersion?: string
  /** 스타일링 방식 (복수 가능: Tailwind + CSS Modules 등) */
  styling: Confident<StylingInfo[]>
  /** UI 라이브러리 (shadcn/ui, Radix, MUI 등) */
  uiLibraries: Confident<string[]>
  /** 애니메이션 라이브러리 (Framer Motion, GSAP 등) */
  animationLibraries: Confident<string[]>
  /** 아이콘 시스템 (lucide, heroicons, SVG 직접 사용 등) */
  iconSystem: Confident<string[]>
  /** 폰트 로딩 방식 (next/font, Google Fonts, 로컬 폰트 등) */
  fontLoading: Confident<string[]>
  /** 패키지 매니저 (npm, yarn, pnpm) */
  packageManager?: string
  /** TypeScript 사용 여부 */
  typescript: boolean
}

/** 스타일링 방식 정보 */
interface StylingInfo {
  name: string
  tier: StylingTier
}

/**
 * 스타일링 방식별 지원 수준.
 * - tier1: Tailwind CSS, CSS Variables — 직접 토큰 추출 + LLM 분석
 * - tier2: CSS Modules, SCSS, Styled Components — LLM 기반 패턴 분석
 * - tier3: CSS-in-JS 런타임, 기타 — 최선 노력, 한계 명시
 */
type StylingTier = 'tier1' | 'tier2' | 'tier3'

// ─── Health Check ───────────────────────────────────────────────
/**
 * Phase 1 완료 후, Phase 2 진입 전 실행되는 사전 점검 결과.
 * 레포의 분석 가능성을 판단한다.
 */
interface HealthCheckResult {
  /** 최종 판정: pass / warn / fail */
  status: 'pass' | 'warn' | 'fail'
  checks: HealthCheckItem[]
  /** fail 사유 또는 warn 세부 내용 */
  summary: string
}

interface HealthCheckItem {
  /** 점검 항목명 */
  name: string
  /** 해당 항목의 판정 */
  status: 'pass' | 'warn' | 'fail'
  /** 상세 메시지 */
  message: string
}
```

---

## 2. Pipeline 타입

4-Phase 파이프라인의 실행 흐름을 제어하는 타입.

```typescript
// ─── Pipeline Config ────────────────────────────────────────────
/** 파이프라인 실행 설정 */
interface PipelineConfig {
  /** 분석 대상 소스 (로컬 경로 또는 GitHub URL) */
  source: string
  /** monorepo인 경우 FE 패키지 경로 (예: 'apps/web') */
  packagePath?: string
  /** 출력 디렉토리 (기본: ditto-output/<project-name>/) */
  outputDir: string
  /** 프로젝트 이름 (기본: 레포/디렉토리 이름에서 추출) */
  projectName: string
  /** LLM 모델 식별자 (기본: gpt-5.2) */
  model: string
  /** LLM temperature (기본: 0.2 — 안정적 구조화 출력) */
  temperature: number
  /** 문서 출력 언어 (기본: ko) */
  language: 'ko' | 'en'
  /** 타겟 구현 스택 (auto면 레퍼런스에서 추론) */
  targetStack: TargetStack
  /** 실행할 Phase 범위 (부분 재생성 지원) */
  phases: PhaseSelection
}

/**
 * Prompt가 생성할 프로젝트의 타겟 기술 스택.
 * 'auto'이면 레퍼런스의 기술 스택에서 자동 결정.
 */
type TargetStack =
  | 'auto'
  | 'nextjs'
  | 'react-vite'
  | 'astro'
  | 'svelte'
  | { custom: string }

/**
 * 실행할 Phase 선택.
 * --docs-only, --prompts-only 등 부분 재생성을 지원.
 */
interface PhaseSelection {
  extraction: boolean
  analysis: boolean
  documentation: boolean
  promptGeneration: boolean
}

// ─── Pipeline Context ───────────────────────────────────────────
/**
 * 파이프라인 실행 중 Phase 간 전달되는 컨텍스트.
 * 각 Phase가 완료되면 결과를 이 컨텍스트에 누적한다.
 */
interface PipelineContext {
  config: PipelineConfig
  /** Phase 1 결과 (extraction 완료 시 존재) */
  extraction?: ExtractionResult
  /** Phase 2 결과 (analysis 완료 시 존재) */
  analysis?: AnalysisResult
  /** Phase 3 결과 (documentation 완료 시 존재) */
  documentSet?: DocumentSet
  /** Phase 4 결과 (promptGeneration 완료 시 존재) */
  promptSet?: PromptSet
  /** 파이프라인 시작 시각 */
  startedAt: Date
  /** 각 Phase별 실행 결과 */
  phaseResults: PhaseResult[]
}

// ─── Phase Result ───────────────────────────────────────────────
/** 개별 Phase의 실행 결과 */
interface PhaseResult {
  phase: PhaseName
  status: 'success' | 'warning' | 'error' | 'skipped'
  /** 소요 시간 (ms) */
  durationMs: number
  /** 경고/에러 메시지 목록 */
  messages: PhaseMessage[]
}

type PhaseName = 'extraction' | 'analysis' | 'documentation' | 'promptGeneration'

interface PhaseMessage {
  level: 'info' | 'warn' | 'error'
  message: string
}
```

---

## 3. Phase 1 출력 타입 — ExtractionResult

Phase 1(Extraction)에서 수집하는 원시 데이터. 코드, 파일 구조, 설정, 기술 스택 정보를 포함한다.

```typescript
/** Phase 1: Extraction의 전체 출력 */
interface ExtractionResult {
  /** 프로젝트 메타 정보 */
  meta: ProjectMeta
  /** 파일 트리 구조 */
  fileTree: FileTreeNode[]
  /** FE 관련 파일에서 추출한 코드 청크 */
  codeChunks: CodeChunk[]
  /** 설정 파일 내용 (tailwind.config, package.json, tsconfig 등) */
  configs: ConfigFile[]
  /** 감지된 기술 스택 */
  techStack: TechStack
  /** 분석 가능성 사전 점검 결과 */
  healthCheck: HealthCheckResult
  /** 추출 통계 */
  stats: ExtractionStats
}

// ─── Project Meta ───────────────────────────────────────────────
interface ProjectMeta {
  /** 프로젝트 이름 */
  name: string
  /** 원본 소스 (URL 또는 로컬 경로) */
  source: string
  /** 분석 일시 (ISO 8601) */
  analyzedAt: string
  /** monorepo 여부 */
  isMonorepo: boolean
  /** 분석 대상 패키지 경로 (monorepo인 경우) */
  packagePath?: string
}

// ─── File Tree ──────────────────────────────────────────────────
/** 파일 트리의 각 노드 */
interface FileTreeNode {
  /** 파일/디렉토리 이름 */
  name: string
  /** 프로젝트 루트 기준 상대 경로 */
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
  /** 파일인 경우 확장자 */
  extension?: string
  /** 파일 크기 (bytes) */
  size?: number
}

// ─── Code Chunk ─────────────────────────────────────────────────
/**
 * FE 관련 파일에서 추출한 코드 조각.
 * LLM에 전달하기 위해 관련도가 높은 파일을 선별하여 청킹한 결과.
 */
interface CodeChunk {
  /** 원본 파일의 상대 경로 */
  filePath: string
  /** 파일 유형 분류 */
  fileType: CodeFileType
  /** 추출된 코드 내용 */
  content: string
  /** 해당 코드의 시작 줄 번호 (전체 파일 기준) */
  startLine?: number
  /** 해당 코드의 끝 줄 번호 */
  endLine?: number
}

type CodeFileType =
  | 'component'        // JSX/TSX 컴포넌트
  | 'style'            // CSS, SCSS, CSS Modules
  | 'config'           // tailwind.config, theme 설정
  | 'layout'           // 레이아웃 컴포넌트/파일
  | 'page'             // 페이지/라우트 파일
  | 'hook'             // 커스텀 훅 (애니메이션 관련 등)
  | 'utility'          // 유틸리티/헬퍼 (스타일 관련)
  | 'asset'            // SVG, 폰트 선언 등
  | 'other'

// ─── Config File ────────────────────────────────────────────────
/** 설정 파일 원본 내용 */
interface ConfigFile {
  /** 파일 상대 경로 */
  filePath: string
  /** 설정 파일 유형 */
  configType: ConfigType
  /** 파일 내용 (문자열) */
  content: string
}

type ConfigType =
  | 'package-json'
  | 'tailwind-config'
  | 'postcss-config'
  | 'tsconfig'
  | 'next-config'
  | 'vite-config'
  | 'theme'             // 커스텀 theme 파일
  | 'css-variables'     // :root CSS Variables 정의 파일
  | 'other'

// ─── Extraction Stats ───────────────────────────────────────────
/** 추출 단계 통계 */
interface ExtractionStats {
  /** 전체 파일 수 */
  totalFiles: number
  /** FE 관련 파일 수 (필터링 후) */
  relevantFiles: number
  /** 추출된 코드 청크 수 */
  codeChunks: number
  /** 설정 파일 수 */
  configFiles: number
  /** 컴포넌트 파일 수 */
  componentFiles: number
  /** 스타일 파일 수 */
  styleFiles: number
  /** 총 코드 라인 수 (추출된 부분) */
  totalLines: number
}
```

---

## 4. Phase 2 출력 타입 — AnalysisResult

Phase 2(Analysis)의 전체 출력이자 `analysis.json`의 스키마.
LLM의 `generateObject()` structured output으로 생성되며, Zod 스키마와 1:1 매핑된다.

```typescript
/** Phase 2: Analysis의 전체 출력 — analysis.json 루트 스키마 */
interface AnalysisResult {
  /** 분석 메타 정보 */
  meta: AnalysisMeta
  /** 디자인 에센스 — 전체 분석의 최종 종합 */
  designEssence: DesignEssence
  /** 디자인 토큰 체계 */
  designTokens: DesignTokens
  /** 컴포넌트 카탈로그 */
  componentCatalog: ComponentCatalog
  /** 레이아웃 시스템 */
  layoutSystem: LayoutSystem
  /** 페이지 구성 */
  pageStructures: PageStructures
  /** 반응형 전략 (레퍼런스가 반응형 미지원 시 null) */
  responsiveStrategy: ResponsiveStrategy | null
  /** 인터랙션 & 애니메이션 패턴 */
  interactionPatterns: InteractionPatterns
  /** 감지된 기술 스택 (Phase 1에서 전달) */
  techStack: TechStack
}

interface AnalysisMeta {
  /** 분석 대상 프로젝트명 */
  projectName: string
  /** 원본 소스 */
  source: string
  /** 분석 일시 (ISO 8601) */
  analyzedAt: string
  /** 사용된 LLM 모델 */
  model: string
  /** 스타일링 방식 티어 (분석 정확도 참고용) */
  stylingTier: StylingTier
  /** 전체 분석 소요 시간 (ms) */
  analysisDurationMs: number
}
```

### 4.1 DesignEssence — 디자인 에센스

전체 분석의 최종 종합. 디자인의 핵심 정체성을 자연어와 구조화된 데이터로 기술한다.

```typescript
/** 디자인의 핵심 정체성 — 전체 분석의 가장 핵심적인 결과 */
interface DesignEssence {
  confidenceLevel: ConfidenceLevel
  /** 디자인 정체성 한 줄 요약 (예: "절제된 여백과 네이비 컬러의 신뢰감 있는 SaaS 대시보드") */
  identity: string
  /** 디자인 원칙 — 이 디자인이 따르는 핵심 규칙들 */
  principles: DesignPrinciple[]
  /** 무드 키워드 (예: ['Clean', 'Professional', 'Trustworthy', 'Calm']) */
  moodKeywords: string[]
  /**
   * 스타일 카테고리 (복수 선택).
   * 참고 목록: Modern SaaS, Corporate/Enterprise, Minimalist, Playful/Creative,
   * Editorial/Magazine, Dashboard/Data, E-commerce, Documentation, Marketing/Landing 등.
   * 목록에 없는 자유 서술도 가능.
   */
  styleCategories: string[]
  /** 시각적 특징 요약 — 각 축별 성격 */
  visualCharacteristics: VisualCharacteristics
  /** Do's & Don'ts — 카테고리별 양산 규칙 */
  dosAndDonts: DosAndDonts
  /** 비슷한 스타일의 레퍼런스 (URL 또는 이름) */
  similarReferences: string[]
}

interface DesignPrinciple {
  /** 원칙 이름 (예: "Whitespace as a Feature") */
  name: string
  /** 원칙 설명 */
  description: string
}

/** 시각적 특징을 축별로 기술 */
interface VisualCharacteristics {
  /** 컬러 무드 (예: "네이비 기반 차분한 톤, 블루 그라데이션으로 깊이감 표현") */
  colorMood: string
  /** 타이포그래피 성격 (예: "Geometric sans-serif로 현대적이고 정돈된 인상") */
  typographyCharacter: string
  /** 여백 성격 (예: "넉넉한 여백으로 콘텐츠에 숨을 주는 spacious 스타일") */
  spacingCharacter: string
  /** 형태 (예: "중간 크기 border-radius, 부드럽지만 과하지 않은 곡선") */
  shape: string
  /** 깊이 (예: "미세한 그림자로 레이어 구분, 전체적으로 플랫에 가까움") */
  depth: string
  /** 모션 (예: "절제된 트랜지션, 빠른 duration, 의미 있는 곳에만 사용") */
  motion: string
}

/**
 * Do's & Don'ts — 이 스타일을 양산할 때 지켜야 할 규칙.
 * 각 규칙은 '규칙 + 이유' 형태. "적절하게", "자연스럽게" 같은 모호한 표현 금지.
 */
interface DosAndDonts {
  color: DosAndDontsCategory
  typography: DosAndDontsCategory
  spacing: DosAndDontsCategory
  component: DosAndDontsCategory
  motion: DosAndDontsCategory
}

interface DosAndDontsCategory {
  dos: DosAndDontsRule[]
  donts: DosAndDontsRule[]
}

interface DosAndDontsRule {
  /** 규칙 내용 (구체적, 실행 가능한 지시) */
  rule: string
  /** 이 규칙의 이유 (디자인 에센스와의 연결) */
  reason: string
}
```

### 4.2 DesignTokens — 디자인 토큰 체계

디자인 시스템의 기본 단위 값들. 각 토큰에는 값과 함께 에센스 관점의 해석을 포함한다.

```typescript
/** 디자인 토큰 체계 전체 */
interface DesignTokens {
  color: ColorTokens
  typography: TypographyTokens
  spacing: SpacingTokens
  borderRadius: BorderRadiusTokens
  shadow: ShadowTokens
  border: BorderTokens
  opacity: OpacityTokens
  zIndex: ZIndexTokens
}

// ─── Color ──────────────────────────────────────────────────────
interface ColorTokens {
  confidenceLevel: ConfidenceLevel
  /**
   * 컬러 톤/무드 자연어 설명
   * (예: "네이비와 화이트 중심의 차분한 톤, 블루 계열 그라데이션이 포인트")
   */
  moodDescription: string
  /** 주요 색상 팔레트 */
  palette: ColorGroup[]
  /** 의미별 색상 매핑 (semantic colors) */
  semantic: SemanticColor[]
  /**
   * 색상 사용 비율 — 배경 지배색, 포인트색, 텍스트색 비중.
   * 에센스 관점에서 "어떤 색이 얼마나 많이 사용되는가"를 파악.
   */
  usageRatio: ColorUsageRatio
  /** 다크모드 지원 여부 및 전환 전략 */
  darkMode: DarkModeStrategy | null
}

interface ColorGroup {
  /** 그룹 이름 (예: 'Primary', 'Neutral', 'Accent') */
  name: string
  /** 이 그룹의 성격/역할 설명 */
  description: string
  colors: ColorToken[]
}

interface ColorToken {
  /** 토큰 이름 (예: 'primary-500', 'background') */
  name: string
  /** 색상 값 (hex, rgb, hsl 등) */
  value: string
  /** 사용 맥락 (예: '주요 CTA 버튼 배경', '본문 텍스트') */
  usage?: string
}

/** 색상 사용 비율 — 전체 화면 대비 대략적 비중 */
interface ColorUsageRatio {
  /** 배경 지배색 (예: { color: 'White (#FFFFFF)', ratio: '~70%' }) */
  dominant: ColorRatioEntry
  /** 보조색 */
  secondary: ColorRatioEntry
  /** 포인트/강조색 */
  accent: ColorRatioEntry
  /** 텍스트색 */
  text: ColorRatioEntry
}

interface ColorRatioEntry {
  /** 색상 설명 */
  color: string
  /** 대략적 사용 비율 */
  ratio: string
}

interface SemanticColor {
  /** 의미 역할 (예: 'success', 'warning', 'error', 'info') */
  role: string
  /** 색상 값 */
  value: string
  /** 사용처 설명 */
  usage: string
}

interface DarkModeStrategy {
  confidenceLevel: ConfidenceLevel
  /** 다크모드 존재 여부 */
  supported: boolean
  /** 전환 방식 (예: 'class-based', 'media-query', 'css-variables') */
  approach?: string
  /** 주요 토큰 매핑 변화 설명 */
  description?: string
}

// ─── Typography ─────────────────────────────────────────────────
interface TypographyTokens {
  confidenceLevel: ConfidenceLevel
  /**
   * 타이포그래피 전체 성격 자연어 설명.
   * 폰트의 시각적 인상, 제목-본문 대비 효과를 포함.
   */
  characterDescription: string
  /**
   * 감정 기여도 — 타이포그래피가 전체 디자인 무드에 기여하는 방식.
   * (예: "Geometric sans-serif가 주는 현대적/기술적 신뢰감이 전체 SaaS 무드의 핵심")
   */
  emotionalContribution: string
  /** 폰트 패밀리 */
  fontFamilies: FontFamily[]
  /** 제목 스케일 (Display ~ H4+) */
  headingScale: TypographyScaleEntry[]
  /** 본문 스케일 (Body Large ~ Caption) */
  bodyScale: TypographyScaleEntry[]
  /** 타이포그래피 원칙 (새 텍스트 요소 추가 시 가이드) */
  principles: string[]
}

interface FontFamily {
  /** 역할 (예: 'primary', 'secondary', 'monospace') */
  role: string
  /** 폰트 패밀리 이름 */
  name: string
  /** fallback 폰트 */
  fallback: string
  /** 이 폰트의 시각적 성격 설명 */
  character: string
}

interface TypographyScaleEntry {
  /** 레벨 이름 (예: 'Display', 'H1', 'Body', 'Caption') */
  level: string
  /** font-size (예: '3rem', '48px') */
  fontSize: string
  /** font-weight (예: '700', 'bold') */
  fontWeight: string
  /** line-height */
  lineHeight: string
  /** letter-spacing (있는 경우) */
  letterSpacing?: string
  /** 사용 용도 (예: '히어로 섹션 메인 제목') */
  usage: string
}

// ─── Spacing ────────────────────────────────────────────────────
interface SpacingTokens {
  confidenceLevel: ConfidenceLevel
  /**
   * 여백 밀도 분류.
   * - compact: 밀집된 레이아웃 (대시보드, 데이터 테이블)
   * - normal: 일반적 여백
   * - spacious: 넉넉한 여백 (랜딩 페이지, 마케팅)
   */
  density: 'compact' | 'normal' | 'spacious'
  /** 여백 밀도에 대한 자연어 설명 */
  densityDescription: string
  /** 간격 스케일 토큰 */
  scale: SpacingScaleEntry[]
  /** 주요 사용 패턴 (섹션 간, 컴포넌트 간, 내부 패딩) */
  usagePatterns: SpacingUsagePattern[]
}

interface SpacingScaleEntry {
  /** 토큰 이름 (예: 'xs', 'sm', 'md', 'lg', 'xl', '2xl') */
  name: string
  /** 값 (예: '4px', '0.25rem') */
  value: string
}

interface SpacingUsagePattern {
  /** 컨텍스트 (예: '섹션 간 간격', '카드 내부 패딩', '인라인 요소 간격') */
  context: string
  /** 주로 사용되는 토큰 또는 값 범위 */
  typicalValue: string
  /** 설명 */
  description: string
}

// ─── Border Radius ──────────────────────────────────────────────
interface BorderRadiusTokens {
  confidenceLevel: ConfidenceLevel
  /**
   * 형태 성격 자연어 설명.
   * (예: "부드러운 중간 곡선 — 날카롭지도, 과하게 둥글지도 않은 균형")
   */
  shapeCharacter: string
  /** radius 스케일 토큰 */
  scale: BorderRadiusScaleEntry[]
}

interface BorderRadiusScaleEntry {
  /** 토큰 이름 (예: 'sm', 'md', 'lg', 'full') */
  name: string
  /** 값 (예: '4px', '8px', '9999px') */
  value: string
  /** 주요 사용처 (예: '버튼', '카드', '아바타') */
  usage: string
}

// ─── Shadow ─────────────────────────────────────────────────────
interface ShadowTokens {
  confidenceLevel: ConfidenceLevel
  /**
   * 깊이 스타일 자연어 설명.
   * (예: "플랫에 가까운 미니멀 스타일, 카드에만 미세한 그림자 사용")
   */
  depthStyle: string
  /** 그림자 스케일 토큰 */
  scale: ShadowScaleEntry[]
}

interface ShadowScaleEntry {
  /** 토큰 이름 (예: 'sm', 'md', 'lg', 'none') */
  name: string
  /** 값 (CSS box-shadow 문법) */
  value: string
  /** 주요 사용처 */
  usage: string
}

// ─── Border ─────────────────────────────────────────────────────
interface BorderTokens {
  confidenceLevel: ConfidenceLevel
  /** 보더 사용 패턴 설명 (예: "구분선으로 미세한 1px 그레이 보더 사용, 컴포넌트 외곽선 없음") */
  patternDescription: string
  /** 보더 토큰 */
  tokens: BorderTokenEntry[]
}

interface BorderTokenEntry {
  /** 토큰 이름 또는 사용 맥락 */
  name: string
  /** 값 (예: '1px solid #e5e7eb') */
  value: string
  /** 사용처 설명 */
  usage: string
}

// ─── Opacity ────────────────────────────────────────────────────
interface OpacityTokens {
  confidenceLevel: ConfidenceLevel
  /** 투명도 스케일 */
  scale: OpacityScaleEntry[]
}

interface OpacityScaleEntry {
  name: string
  value: string
  usage?: string
}

// ─── Z-Index ────────────────────────────────────────────────────
interface ZIndexTokens {
  confidenceLevel: ConfidenceLevel
  /** z-index 체계 */
  scale: ZIndexScaleEntry[]
}

interface ZIndexScaleEntry {
  /** 레이어 이름 (예: 'base', 'dropdown', 'modal', 'tooltip') */
  name: string
  /** 값 */
  value: number
  usage?: string
}
```

### 4.3 ComponentCatalog — 컴포넌트 카탈로그

레퍼런스에 존재하는 UI 컴포넌트를 카테고리별로 분류하고, 각각의 디자인적 특징을 기술한다.

```typescript
/** 컴포넌트 카탈로그 전체 */
interface ComponentCatalog {
  confidenceLevel: ConfidenceLevel
  /** 컴포넌트 총 수 */
  totalCount: number
  /** 카테고리별 요약 */
  categorySummary: CategorySummary[]
  /** 전체 컴포넌트 목록 (카테고리별 그룹핑) */
  categories: ComponentCategory[]
}

interface CategorySummary {
  category: ComponentCategoryType
  count: number
  /** 이 카테고리의 전체적인 디자인 특징 요약 */
  designNote: string
}

/** 컴포넌트 카테고리 분류 */
type ComponentCategoryType =
  | 'primitive'       // Button, Input, Badge, Avatar
  | 'composite'       // Card, Dialog, Dropdown, Tabs
  | 'layout'          // Header, Footer, Sidebar, Container
  | 'page-section'    // Hero, Features, Pricing, CTA
  | 'navigation'      // Nav, Breadcrumb, Pagination
  | 'data-display'    // Table, List, Chart
  | 'feedback'        // Toast, Alert, Skeleton, Spinner
  | 'form'            // Form, FormField, Select, Checkbox

interface ComponentCategory {
  category: ComponentCategoryType
  components: ComponentEntry[]
}

/** 개별 컴포넌트의 분석 결과 */
interface ComponentEntry {
  confidenceLevel: ConfidenceLevel
  /** 컴포넌트 이름 */
  name: string
  /** 원본 파일 경로 */
  filePath: string
  /** 카테고리 */
  category: ComponentCategoryType
  /** 디자인적 특징 자연어 서술 */
  designDescription: string
  /**
   * 시각적 무게.
   * - light: 배경에 녹아드는 가벼운 요소
   * - medium: 보통 수준의 시각적 존재감
   * - heavy: 시선을 끄는 강한 존재감 (CTA 등)
   */
  visualWeight: 'light' | 'medium' | 'heavy'
  /** Variant 목록 (크기, 색상, 스타일 변형) */
  variants: ComponentVariant[]
  /** 상태 목록 (hover, active, disabled, loading 등) */
  states: ComponentState[]
  /**
   * 상태 전이 흐름 — 주요 상태 간 전환 순서.
   * (예: ['default', 'hover', 'active', 'loading', 'success'])
   */
  stateTransitionFlow?: string[]
  /** 사용 맥락 — 어떤 상황/위치에서 사용되는지 */
  usageContext: string[]
  /** 사용처 — 어떤 페이지/섹션에서 사용되는지 */
  usedIn: string[]
  /** 하위 컴포넌트 (이 컴포넌트가 내부적으로 사용하는 다른 컴포넌트) */
  subComponents?: string[]
  /** 스타일링 패턴 요약 */
  stylingPattern?: string
}

interface ComponentVariant {
  /** 변형 축 (예: 'size', 'color', 'style') */
  axis: string
  /** 변형 옵션들 (예: ['sm', 'md', 'lg']) */
  options: string[]
  /** 기본값 */
  defaultValue?: string
}

interface ComponentState {
  /** 상태 이름 (예: 'hover', 'active', 'disabled', 'loading', 'error') */
  name: string
  /** 이 상태에서의 시각적 변화 설명 */
  visualChange: string
}
```

### 4.4 LayoutSystem — 레이아웃 시스템

페이지의 구조적 틀과 간격 패턴.

```typescript
/** 레이아웃 시스템 전체 */
interface LayoutSystem {
  confidenceLevel: ConfidenceLevel
  /** 그리드 시스템 */
  grid: GridSystem
  /** 컨테이너 전략 */
  container: ContainerStrategy
  /** 간격 리듬 */
  spacingRhythm: SpacingRhythm
  /** 반복되는 레이아웃 패턴 */
  commonPatterns: LayoutPattern[]
  /** 시각적 계층 구조 — 시선 흐름, 정보 우선순위 */
  visualHierarchy: VisualHierarchy
}

interface GridSystem {
  confidenceLevel: ConfidenceLevel
  /** 그리드 타입 (예: 'css-grid', 'flexbox', 'hybrid') */
  type: string
  /** 컬럼 수 (있는 경우) */
  columns?: number
  /** 거터/갭 크기 */
  gap?: string
  /** 자연어 설명 */
  description: string
}

interface ContainerStrategy {
  confidenceLevel: ConfidenceLevel
  /** 컨테이너 타입 (예: 'fixed-max-width', 'fluid', 'hybrid') */
  type: string
  /** max-width 값 (있는 경우) */
  maxWidth?: string
  /** 좌우 패딩 */
  padding?: string
  /** 센터링 방식 */
  centering?: string
  /** 자연어 설명 */
  description: string
}

/** 간격 리듬 — 섹션/컴포넌트/내부 패딩 패턴 */
interface SpacingRhythm {
  /** 섹션 간 간격 패턴 */
  betweenSections: string
  /** 컴포넌트 간 간격 패턴 */
  betweenComponents: string
  /** 내부 패딩 패턴 */
  internalPadding: string
  /** 리듬 설명 */
  description: string
}

/** 반복되는 레이아웃 패턴 */
interface LayoutPattern {
  /** 패턴 이름 (예: '2-column hero', 'card grid 3-col', 'centered CTA') */
  name: string
  /** 패턴 설명 */
  description: string
  /** ASCII 다이어그램 (선택) */
  diagram?: string
  /** 사용처 */
  usedIn: string[]
}

/** 시각적 계층 구조 */
interface VisualHierarchy {
  confidenceLevel: ConfidenceLevel
  /** 시선 흐름 패턴 설명 (예: "Z-pattern: 로고 → 네비 → 히어로 텍스트 → CTA") */
  eyeFlowPattern: string
  /** 정보 우선순위 배치 설명 */
  informationPriority: string
  /** 강조 요소 배치 패턴 설명 */
  emphasisPlacement: string
}
```

### 4.5 PageStructures — 페이지 구성

각 페이지가 어떤 섹션들로 구성되는지 분석한 결과.

```typescript
/** 페이지 구성 전체 */
interface PageStructures {
  confidenceLevel: ConfidenceLevel
  /** 페이지 목록 */
  pages: PageEntry[]
}

/** 개별 페이지 분석 결과 */
interface PageEntry {
  confidenceLevel: ConfidenceLevel
  /** 페이지 이름 */
  name: string
  /** 라우트 경로 (예: '/', '/pricing', '/blog/:slug') */
  route: string
  /** 페이지의 목적/역할 */
  purpose: string
  /** 섹션 구성 (순서대로) */
  sections: PageSection[]
  /** 섹션 간 시각적 구분 방법 (예: '배경색 교차', '구분선', '여백만으로 구분') */
  sectionDivision: string
  /** 이 페이지만의 고유한 디자인 요소 */
  uniqueDesignElements?: string[]
}

/** 페이지 내 개별 섹션 */
interface PageSection {
  /** 섹션 이름 (예: 'Hero', 'Features Grid', 'Testimonials') */
  name: string
  /** 섹션의 역할/목적 */
  purpose: string
  /** 사용되는 주요 컴포넌트 */
  components: string[]
  /** 적용된 레이아웃 패턴 */
  layout: string
  /** 배경 스타일 (예: 'white', 'gray-50', 'gradient') */
  background?: string
  /** 추가 디자인 노트 */
  designNote?: string
}
```

### 4.6 ResponsiveStrategy — 반응형 전략

레퍼런스의 반응형 대응 수준에 맞춰 분석. 반응형 미지원 시 `null`.

```typescript
/** 반응형 전략 전체 */
interface ResponsiveStrategy {
  confidenceLevel: ConfidenceLevel
  /** 접근 방식 */
  approach: 'mobile-first' | 'desktop-first'
  /** 브레이크포인트 정의 */
  breakpoints: BreakpointEntry[]
  /** 반응형 패턴 */
  patterns: ResponsivePattern[]
  /** 반응형 타이포그래피 전략 */
  responsiveTypography: ResponsiveTypography | null
  /** 반응형 간격 전략 */
  responsiveSpacing: ResponsiveSpacing | null
}

interface BreakpointEntry {
  /** 이름 (예: 'sm', 'md', 'lg', 'xl') */
  name: string
  /** 값 (예: '640px', '768px') */
  value: string
  /** 이 breakpoint에서의 주요 레이아웃 변화 설명 */
  majorChanges: string
}

/** 반응형 패턴 (네비게이션 변화, 그리드 축소 등) */
interface ResponsivePattern {
  /** 패턴 이름 (예: 'Navigation collapse', 'Grid stack', 'Element hide/show') */
  name: string
  /** 패턴 설명 */
  description: string
  /** 적용 breakpoint */
  breakpoint: string
}

/** 반응형 타이포그래피 (clamp, 뷰포트 기반 스케일링 등) */
interface ResponsiveTypography {
  /** 전략 (예: 'clamp-based', 'breakpoint-override', 'viewport-units') */
  strategy: string
  description: string
}

/** 반응형 간격 (breakpoint별 패딩/마진 변화) */
interface ResponsiveSpacing {
  strategy: string
  description: string
}
```

### 4.7 InteractionPatterns — 인터랙션 & 애니메이션

사용자 인터랙션과 시각적 동작 패턴.

```typescript
/** 인터랙션 & 애니메이션 패턴 전체 */
interface InteractionPatterns {
  confidenceLevel: ConfidenceLevel
  /**
   * 전체 모션 스타일.
   * (예: 'restrained' | 'moderate' | 'expressive')
   */
  overallMotionStyle: string
  /** 모션 스타일 자연어 설명 */
  motionStyleDescription: string
  /** 기본 트랜지션 설정 */
  defaultTransition: DefaultTransition
  /** hover 효과 패턴 */
  hoverEffects: HoverEffect[]
  /** 페이지/섹션 진입 애니메이션 */
  entranceAnimations: EntranceAnimation[]
  /** 스크롤 기반 동작 */
  scrollBehaviors: ScrollBehavior[]
  /** 마이크로인터랙션 */
  microInteractions: MicroInteraction[]
  /** 로딩 상태 패턴 */
  loadingPatterns: LoadingPattern[]
  /** 사용 라이브러리의 활용 패턴 */
  libraryUsage: AnimationLibraryUsage | null
  /** 모션 원칙 (새 애니메이션 추가 시 따를 규칙) */
  motionPrinciples: string[]
}

interface DefaultTransition {
  confidenceLevel: ConfidenceLevel
  /** duration (예: '150ms', '200ms') */
  duration: string
  /** easing (예: 'ease-out', 'cubic-bezier(0.4, 0, 0.2, 1)') */
  easing: string
  /** 주로 트랜지션이 적용되는 CSS 속성 */
  properties: string[]
}

interface HoverEffect {
  /** 대상 요소 (예: 'Button', 'Card', 'Link', 'Nav item') */
  target: string
  /** 효과 설명 (예: '배경색 밝아짐 + 미세한 translateY(-1px)') */
  effect: string
  confidenceLevel: ConfidenceLevel
}

interface EntranceAnimation {
  /** 대상 (예: 'Hero section', 'Card list', 'Page transition') */
  target: string
  /** 애니메이션 설명 */
  animation: string
  /** 트리거 (예: 'page-load', 'scroll-into-view') */
  trigger: string
  confidenceLevel: ConfidenceLevel
}

interface ScrollBehavior {
  /** 유형 (예: 'scroll-triggered', 'parallax', 'sticky', 'progress-indicator') */
  type: string
  /** 설명 */
  description: string
  confidenceLevel: ConfidenceLevel
}

interface MicroInteraction {
  /** 대상 (예: 'Toggle switch', 'Checkbox', 'Accordion', 'Tooltip') */
  target: string
  /** 인터랙션 설명 */
  description: string
  confidenceLevel: ConfidenceLevel
}

interface LoadingPattern {
  /** 유형 (예: 'skeleton', 'spinner', 'progress-bar', 'shimmer') */
  type: string
  /** 설명 */
  description: string
  confidenceLevel: ConfidenceLevel
}

interface AnimationLibraryUsage {
  /** 라이브러리 이름 (예: 'Framer Motion', 'GSAP') */
  library: string
  /** 주요 활용 패턴 */
  patterns: string[]
  /** 특이 사항 */
  notes?: string
}
```

---

## 5. Phase 3 출력 타입 — DocumentSet

Phase 3(Documentation)에서 생성하는 디자인 스펙 문서 세트.
문서 구성은 **동적** — 기본 7개 문서를 기준으로, 해당 없는 문서는 생략하고 필요 시 추가한다.

```typescript
/** Phase 3: Documentation의 전체 출력 */
interface DocumentSet {
  /** 프로젝트 이름 */
  projectName: string
  /** 출력 디렉토리 경로 */
  outputDir: string
  /** 생성된 문서 목록 */
  documents: DocumentEntry[]
  /** analysis.json 파일 경로 */
  analysisJsonPath: string
}

/** 개별 문서 항목 */
interface DocumentEntry {
  /** 파일명 (예: '00-overview.md') */
  fileName: string
  /** 문서 제목 */
  title: string
  /** 문서의 역할/목적 */
  purpose: string
  /** 문서 유형 */
  type: DocumentType
  /** 생성된 마크다운 내용 */
  content: string
  /** 이 문서가 생성된 이유 (동적 문서인 경우 특히 중요) */
  generationReason?: string
}

/**
 * 문서 유형.
 * - core: 기본 7개 문서 (분석 결과에 해당 내용이 있으면 생성)
 * - dynamic: 레퍼런스 특성에 따라 추가 생성된 문서
 */
type DocumentType = 'core' | 'dynamic'

/**
 * 기본 문서 식별자.
 * 동적 문서 생성 시 기본 문서와의 관계를 판단하는 데 사용.
 */
type CoreDocumentId =
  | 'overview'               // 00-overview.md
  | 'design-tokens'          // 01-design-tokens.md
  | 'typography'             // 02-typography.md
  | 'component-catalog'      // 03-component-catalog.md
  | 'layout-system'          // 04-layout-system.md
  | 'page-structures'        // 05-page-structures.md
  | 'responsive-strategy'    // 06-responsive-strategy.md
  | 'interactions'           // 07-interactions.md
```

---

## 6. Phase 4 출력 타입 — PromptSet

Phase 4(Prompt Generation)에서 생성하는 AI Coding Agent용 단계별 구현 Prompt 세트.

```typescript
/** Phase 4: Prompt Generation의 전체 출력 */
interface PromptSet {
  /** 프로젝트 이름 */
  projectName: string
  /** 출력 디렉토리 경로 */
  outputDir: string
  /** 타겟 구현 스택 (최종 결정된 값) */
  targetStack: ResolvedTargetStack
  /** 단계별 Prompt 목록 (순서대로) */
  steps: PromptStep[]
  /** README.md 내용 */
  readmeContent: string
}

/** 최종 결정된 타겟 스택 (auto가 해소된 상태) */
interface ResolvedTargetStack {
  /** 프레임워크 (예: 'Next.js 15', 'React + Vite') */
  framework: string
  /** 스타일링 (예: 'Tailwind CSS 4') */
  styling: string
  /** 주요 라이브러리 (예: ['shadcn/ui', 'Framer Motion']) */
  libraries: string[]
  /** 스택 결정 근거 (auto인 경우 추론 과정) */
  reasoning: string
}

/**
 * 개별 Prompt 단계.
 * 각 Prompt는 표준 구조(Goal, Prerequisites, Context, Instructions,
 * Design Reference, Expected Outcome, Validation)를 따른다.
 */
interface PromptStep {
  /** 단계 번호 (1부터 시작) */
  stepNumber: number
  /** 단계 식별자 (예: 'project-setup', 'design-system', 'base-components') */
  id: PromptStepId
  /** 단계 제목 */
  title: string
  /** 파일명 (예: 'step-01-project-setup.md') */
  fileName: string
  /** 선행 단계 번호 목록 (없으면 빈 배열) */
  prerequisites: number[]
  /** 이 단계의 목표 (1~2문장) */
  goal: string
  /** 생성된 Prompt 전문 (마크다운) */
  content: string
  /**
   * 이 단계에서 생성/수정 예상 파일 수.
   * 분할 규칙 준수 검증용 (5~15개 목표).
   */
  estimatedFileCount: number
  /** 이 단계에서 다루는 컴포넌트 수 (해당 시) */
  estimatedComponentCount?: number
}

/**
 * Prompt 단계 식별자.
 * 기본 단계(항상 존재) + 가변 단계(분석 결과에 따라).
 */
type PromptStepId =
  // 기본 단계 (항상 존재)
  | 'project-setup'
  | 'design-system'
  // 컴포넌트 단계 (가변)
  | 'base-components'
  | `base-components-${number}`       // 분할 시
  | 'layout-components'
  | 'composite-components'
  | `composite-components-${number}`  // 분할 시
  // 페이지 단계 (가변)
  | 'page-implementation'
  | `page-implementation-${number}`   // 분할 시
  // 마무리 단계 (선택)
  | 'responsive'
  | 'interactions'
  // 동적 추가 단계
  | `custom-${string}`
```

---

## 7. CLI 타입

CLI 명령어의 옵션과 설정 관리 타입.

```typescript
// ─── analyze 명령어 옵션 ────────────────────────────────────────
/** `ditto analyze` 명령어의 옵션 */
interface AnalyzeOptions {
  /** 분석 대상 소스 (positional argument) — 로컬 경로 또는 GitHub URL */
  source: string
  /** monorepo 내 특정 패키지 경로 */
  package?: string
  /** 출력 디렉토리 (기본: ./ditto-output/<project-name>) */
  output?: string
  /** LLM 모델 (기본: gpt-5.2) */
  model?: string
  /** 타겟 구현 스택 (기본: auto) */
  stack?: string
  /** 문서 출력 언어 (기본: ko) */
  language?: 'ko' | 'en'
  /** analysis.json 기반 문서만 재생성 (Phase 3만 실행) */
  docsOnly?: boolean
  /** analysis.json 기반 Prompt만 재생성 (Phase 4만 실행) */
  promptsOnly?: boolean
  /** 기존 analysis.json 경로 (--docs-only, --prompts-only와 함께 사용) */
  analysisPath?: string
}

// ─── config 명령어 옵션 ─────────────────────────────────────────
/** `ditto config` 명령어의 옵션 */
interface ConfigOptions {
  /** 설정 키 (예: 'apiKey', 'model', 'language') */
  key?: string
  /** 설정 값 */
  value?: string
  /** 전체 설정 표시 */
  list?: boolean
  /** 설정 초기화 */
  reset?: boolean
}

// ─── 사용자 설정 ────────────────────────────────────────────────
/**
 * c12 기반 설정 파일 스키마.
 * ditto.config.ts 또는 환경변수로 관리.
 */
interface DittoConfig {
  /** LLM API 키 (환경변수 DITTO_API_KEY 우선) */
  apiKey?: string
  /** 기본 LLM 모델 */
  model?: string
  /** 기본 출력 디렉토리 */
  outputDir?: string
  /** 기본 문서 언어 */
  language?: 'ko' | 'en'
  /** 기본 타겟 스택 */
  targetStack?: string
  /** LLM temperature */
  temperature?: number
}
```

---

## 8. 타입 관계 요약

파이프라인 데이터 흐름과 타입 간 관계를 정리한다.

```
PipelineConfig
      │
      ▼
┌─────────────┐     ┌───────────────────┐
│  Phase 1    │────▶│ ExtractionResult  │
│ Extraction  │     │  ├ FileTreeNode[] │
└─────────────┘     │  ├ CodeChunk[]    │
                    │  ├ ConfigFile[]   │
                    │  ├ TechStack      │
                    │  └ HealthCheckResult
                    └───────┬───────────┘
                            │
                            ▼
┌─────────────┐     ┌───────────────────┐
│  Phase 2    │────▶│ AnalysisResult    │  ← analysis.json 스키마
│ Analysis    │     │  ├ DesignEssence  │
└─────────────┘     │  ├ DesignTokens   │
                    │  ├ ComponentCatalog│
                    │  ├ LayoutSystem   │
                    │  ├ PageStructures │
                    │  ├ ResponsiveStrategy│
                    │  └ InteractionPatterns│
                    └───────┬───────────┘
                            │
                   ┌────────┴────────┐
                   ▼                 ▼
┌─────────────┐  ┌───────────┐  ┌───────────┐
│  Phase 3    │  │DocumentSet│  │  Phase 4   │
│Documentation│─▶│ documents │  │PromptGen  │─▶ PromptSet
└─────────────┘  └───────────┘  └───────────┘    └ steps: PromptStep[]

모든 분석 항목:  ConfidenceLevel ('high' | 'medium' | 'low')
모든 Phase 결과: PhaseResult → PipelineContext.phaseResults[]
```

---

## 9. Zod 스키마 연동 참고

이 문서의 TypeScript 인터페이스는 Vercel AI SDK의 `generateObject()` + Zod structured output과 1:1 매핑된다. 구현 시 아래 패턴을 따른다:

```typescript
import { z } from 'zod'
import { generateObject } from 'ai'

// 예시: ConfidenceLevel Zod 스키마
const confidenceLevelSchema = z.enum(['high', 'medium', 'low'])

// 예시: Confident<T> 패턴
function confident<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    value: schema,
    confidenceLevel: confidenceLevelSchema,
    note: z.string().optional(),
  })
}

// 예시: DesignEssence의 일부
const designPrincipleSchema = z.object({
  name: z.string(),
  description: z.string(),
})

// generateObject()에서 사용
const result = await generateObject({
  model,
  schema: analysisResultSchema,  // AnalysisResult의 Zod 스키마
  prompt: '...',
})
// result.object는 AnalysisResult 타입으로 추론됨
```

> **주의**: 실제 Zod 스키마 구현은 별도 소스 파일에서 관리한다.
> 이 문서는 타입의 구조와 의미를 정의하는 계약 문서이며, Zod 스키마는 이 문서를 기반으로 구현한다.
