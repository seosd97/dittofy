# 05. LLM Integration — LLM 클라이언트, 컨텍스트 관리, 청킹 전략

## 1. 클라이언트 추상화 계층

### 1.1 Provider 설정

Vercel AI SDK의 멀티 프로바이더 아키텍처를 활용하여, 모델 교체가 설정 한 줄 변경으로 가능하도록 추상화한다.

```typescript
// src/llm/providers.ts
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
```

### 1.2 ModelConfig

모든 LLM 호출에 사용되는 통일된 설정 인터페이스:

```typescript
// src/llm/types.ts
import type { LanguageModel } from "ai"

export interface ModelConfig {
  /** Vercel AI SDK LanguageModel 인스턴스 */
  model: LanguageModel
  /** 생성 온도 — 분석은 낮게, 에센스 서술은 약간 높게 */
  temperature: number
  /** 최대 출력 토큰 */
  maxTokens: number
}

export interface LLMCallOptions extends ModelConfig {
  /** 재시도 횟수 (기본 3) */
  maxRetries?: number
  /** 단일 호출 타임아웃 ms (기본 120_000) */
  timeout?: number
}
```

Phase별, 분석기별로 최적화된 프리셋을 제공한다:

| 용도 | temperature | maxTokens | 이유 |
|------|-------------|-----------|------|
| Token Analyzer | 0.1 | 4,096 | 정량적 값 추출 — 일관성 최우선 |
| Component Analyzer | 0.2 | 8,192 | 구조 분석 + 디자인 특징 서술 |
| Layout Analyzer | 0.2 | 4,096 | 패턴 인식 + 구조 서술 |
| Page Analyzer | 0.2 | 4,096 | 구성 분석 |
| Responsive Analyzer | 0.1 | 4,096 | breakpoint 등 정량 데이터 중심 |
| Interaction Analyzer | 0.2 | 4,096 | 패턴 인식 + 모션 성격 서술 |
| Essence Synthesizer | 0.4 | 8,192 | 종합적 디자인 해석 — 창의적 서술 허용 |
| Doc Generator (Phase 3) | 0.3 | 16,384 | 긴 문서 생성 — 자연어 품질 중요 |
| Prompt Generator (Phase 4) | 0.2 | 16,384 | 정확한 지시문 — 구체성 중요 |

### 1.3 Structured Output 전략 — `generateObject()` + Zod

Ditto의 LLM 호출은 **모두 `generateObject()`를 사용**한다. 자유 텍스트 생성(`generateText()`)은 사용하지 않는다.

**이유:**
- `analysis.json`에 저장되는 구조화된 분석 결과가 핵심 산출물
- Phase 간 데이터 전달이 타입 안전해야 함
- 마크다운 문서/Prompt도 구조화된 스키마의 필드로 생성 (섹션별 분리)
- 파싱 실패 리스크 제거

```typescript
// src/llm/client.ts
import { generateObject } from "ai"
import type { z } from "zod"
import type { LLMCallOptions } from "./types"

export async function callLLM<T extends z.ZodType>(
  options: LLMCallOptions & {
    system: string
    prompt: string
    schema: T
    schemaName: string
    schemaDescription?: string
  },
): Promise<z.infer<T>> {
  const { model, temperature, maxTokens, system, prompt, schema, schemaName, schemaDescription, maxRetries = 3, timeout = 120_000 } = options

  const result = await generateObject({
    model,
    temperature,
    maxTokens,
    system,
    prompt,
    schema,
    schemaName,
    schemaDescription,
    maxRetries,
    abortSignal: AbortSignal.timeout(timeout),
  })

  return result.object
}
```

**Phase 3/4의 마크다운 출력도 Structured Output으로 처리하는 방법:**

```typescript
// Phase 3 문서 생성 스키마 예시
const designTokensDocSchema = z.object({
  title: z.string(),
  colorPaletteSection: z.string().describe("Color Palette 섹션의 마크다운 내용"),
  spacingSection: z.string().describe("Spacing Scale 섹션의 마크다운 내용"),
  borderRadiusSection: z.string().describe("Border Radius 섹션의 마크다운 내용"),
  shadowSection: z.string().describe("Shadow Scale 섹션의 마크다운 내용"),
  borderSection: z.string().describe("Border 사용 패턴 섹션의 마크다운 내용"),
})
```

이렇게 하면 각 섹션을 독립적으로 검증/재생성할 수 있고, 전체 문서를 한번에 생성하는 것보다 품질 제어가 용이하다.

### 1.4 재시도/폴백 로직

```typescript
// src/llm/retry.ts
import { APICallError, RetryError } from "ai"
import consola from "consola"

export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY,
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (!isRetryable(error)) {
        throw error
      }

      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config, error)
        consola.warn(
          `LLM 호출 실패 (시도 ${attempt + 1}/${config.maxRetries + 1}): ${lastError.message}. ${delay}ms 후 재시도...`,
        )
        await sleep(delay)
      }
    }
  }

  throw lastError
}

function isRetryable(error: unknown): boolean {
  if (error instanceof APICallError) {
    // 429 Rate Limit, 500/502/503 서버 오류만 재시도
    const status = error.statusCode
    return status === 429 || (status !== undefined && status >= 500)
  }
  // 타임아웃
  if (error instanceof Error && error.name === "AbortError") {
    return true
  }
  // Vercel AI SDK의 RetryError (구조화 출력 스키마 불일치)
  if (error instanceof RetryError) {
    return true
  }
  return false
}

function calculateDelay(
  attempt: number,
  config: RetryConfig,
  error: unknown,
): number {
  // Rate Limit인 경우 Retry-After 헤더 존중
  if (error instanceof APICallError && error.statusCode === 429) {
    const retryAfter = extractRetryAfter(error)
    if (retryAfter) return retryAfter * 1_000
  }

  // 지수 백오프 + 지터
  const exponential = config.baseDelayMs * 2 ** attempt
  const jitter = Math.random() * config.baseDelayMs
  return Math.min(exponential + jitter, config.maxDelayMs)
}

function extractRetryAfter(error: APICallError): number | undefined {
  const headers = error.responseHeaders
  const value = headers?.["retry-after"]
  return value ? Number.parseInt(value, 10) : undefined
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
```

**모델 폴백 전략:**

기본 모델 호출 실패 시, 사용자 설정에 따라 폴백 모델로 전환할 수 있다:

```typescript
// src/llm/fallback.ts
import type { LanguageModel } from "ai"
import consola from "consola"

export interface FallbackChain {
  primary: LanguageModel
  fallbacks: LanguageModel[]
}

export async function callWithFallback<T>(
  chain: FallbackChain,
  fn: (model: LanguageModel) => Promise<T>,
): Promise<T> {
  const models = [chain.primary, ...chain.fallbacks]

  for (let i = 0; i < models.length; i++) {
    try {
      return await fn(models[i])
    } catch (error) {
      if (i < models.length - 1) {
        consola.warn(
          `모델 ${models[i].modelId} 실패. 폴백 모델 ${models[i + 1].modelId}로 전환...`,
        )
      } else {
        throw error
      }
    }
  }

  throw new Error("모든 모델이 실패했습니다")
}
```

---

## 2. 프롬프트 템플릿 관리

### 2.1 시스템 프롬프트 구조

모든 LLM 호출의 시스템 프롬프트는 세 영역으로 구성된다:

```
┌─────────────────────────────┐
│  1. 역할 정의 (Role)         │  "너는 FE 디자인 시스템 전문 분석가다"
├─────────────────────────────┤
│  2. 분석 원칙 (Principles)   │  피델리티 철학, 에센스 vs 디테일 기준
├─────────────────────────────┤
│  3. 출력 규칙 (Output Rules) │  언어, confidence level, 구체성 기준
└─────────────────────────────┘
```

```typescript
// src/prompts/system.ts
export function buildSystemPrompt(context: {
  role: string
  principles: string[]
  outputRules: string[]
}): string {
  return [
    `# Role\n${context.role}`,
    `# Principles\n${context.principles.map((p) => `- ${p}`).join("\n")}`,
    `# Output Rules\n${context.outputRules.map((r) => `- ${r}`).join("\n")}`,
  ].join("\n\n")
}

/** 전 분석기 공통 원칙 */
export const SHARED_PRINCIPLES = [
  "이 분석의 목적은 1:1 복제가 아닌, 디자인 에센스 추출이다. 같은 스타일을 양산할 수 있는 수준의 이해를 도출하라.",
  "값(value)만 나열하지 말고, 그 값이 주는 시각적 인상/느낌을 자연어로 설명하라.",
  "정보가 부족한 항목은 코드 패턴에서 최대한 유추하되, confidence level을 명시하라.",
  "모호한 표현('적절하게', '자연스럽게') 대신 구체적 기준이나 수치를 사용하라.",
  "하드코딩된 값만 있는 경우, 반복 패턴에서 토큰 체계를 추론하라.",
]

export const SHARED_OUTPUT_RULES = [
  "confidence level: high(명시적 정의 존재), medium(코드 패턴에서 유추), low(정보 부족으로 추론)",
  "설명 언어: 한국어 (코드, 토큰 이름, 기술 용어는 영어 유지)",
  "모든 수치에는 단위를 명시하라 (px, rem, ms 등)",
]
```

### 2.2 Phase 2 분석기별 프롬프트 설계 방향

각 분석기는 **특화된 역할**과 **집중 관점**을 가진다:

#### Token Analyzer
- **역할**: 디자인 토큰 추출 전문가
- **집중 입력**: tailwind.config, CSS Variables 정의 파일, globals.css, theme 파일
- **핵심 지시**: 명시적 토큰은 정확히 추출하고, 하드코딩된 반복 값에서 암묵적 토큰 체계를 추론. 각 토큰 카테고리(Color, Spacing, Radius, Shadow, Border)의 시각적 성격을 서술.
- **출력 스키마**: `TokenAnalysisResult` (카테고리별 토큰 배열 + 톤/무드 서술 + confidence)

#### Component Analyzer
- **역할**: UI 컴포넌트 구조/패턴 분석가
- **집중 입력**: components/ 디렉토리의 JSX/TSX 파일, 스타일 파일
- **핵심 지시**: 컴포넌트 목록 작성, 카테고리 분류, 각 컴포넌트의 디자인적 특징(variants, states, 시각적 무게)을 서술. 조합 관계와 사용 맥락을 파악.
- **출력 스키마**: `ComponentAnalysisResult` (카테고리별 컴포넌트 배열 + 디자인 특징)

#### Layout Analyzer
- **역할**: 레이아웃 시스템/구조 분석가
- **집중 입력**: 레이아웃 컴포넌트, 페이지 루트 파일, Container/Grid 관련 코드
- **핵심 지시**: 그리드 시스템, 컨테이너 전략, 간격 리듬, 반복 레이아웃 패턴을 파악. 시각적 계층 구조와 시선 흐름을 분석.
- **출력 스키마**: `LayoutAnalysisResult` (그리드/컨테이너/간격 + 패턴 배열)

#### Page Analyzer
- **역할**: 페이지 구성/정보 구조 분석가
- **집중 입력**: pages/ 또는 app/ 라우트 파일, 각 페이지의 섹션 구성
- **핵심 지시**: 페이지 목록, 각 페이지의 섹션 구성(순서, 역할, 사용 컴포넌트), 섹션 간 시각적 구분 방법을 분석.
- **출력 스키마**: `PageAnalysisResult` (페이지 배열 + 섹션 구성)

#### Responsive Analyzer
- **역할**: 반응형 전략 분석 전문가
- **집중 입력**: tailwind.config의 breakpoints, 미디어 쿼리 사용 패턴, 반응형 유틸리티 클래스
- **핵심 지시**: 접근 방식(mobile-first/desktop-first), breakpoint 정의, 각 breakpoint에서의 주요 변화 패턴 파악. 레퍼런스가 반응형을 미지원 시 그 사실을 명시.
- **출력 스키마**: `ResponsiveAnalysisResult` (breakpoints + 패턴 + 접근 방식)

#### Interaction Analyzer
- **역할**: 인터랙션/애니메이션 패턴 분석가
- **집중 입력**: 애니메이션 라이브러리 사용 코드, CSS transition/animation, 이벤트 핸들러
- **핵심 지시**: 전체 모션 스타일(절제적/화려한/부드러운), 기본 트랜지션 패턴, hover 효과, 진입 애니메이션, 스크롤 기반 동작, 마이크로인터랙션을 분석.
- **출력 스키마**: `InteractionAnalysisResult` (모션 스타일 + 패턴 배열)

#### Essence Synthesizer
- **역할**: 디자인 에센스 종합 해석가
- **집중 입력**: **위 6개 분석기의 결과 전체** (코드가 아닌 분석 결과를 입력으로 받음)
- **핵심 지시**: 개별 분석 결과를 종합하여 디자인의 핵심 정체성을 도출. 디자인 원칙, 무드 키워드, 스타일 카테고리, 시각적 특징 요약, Do's & Don'ts를 작성. 이 분석기의 출력이 전체 분석의 최종이자 가장 핵심적인 결과.
- **출력 스키마**: `EssenceSynthesisResult` (정체성 + 원칙 + Do's & Don'ts)

### 2.3 Phase 3 문서 생성 프롬프트 방향

Phase 3는 Phase 2의 `analysis.json`을 입력으로 받아 마크다운 디자인 스펙 문서를 생성한다.

**프롬프트 전략:**
- **역할**: "디자인 시스템 문서 작성 전문가"
- **입력**: 해당 문서에 필요한 analysis.json의 관련 섹션
- **핵심 지시**:
  - 값 테이블만 나열하지 않고, "왜 이 값들이 이런 느낌을 주는지" 설명
  - 구체적 수치 + 자연어 설명 병행
  - 양산 가능성에 초점 — "이 문서를 읽고 같은 스타일의 새로운 것을 만들 수 있어야 함"
  - Do's & Don'ts는 "규칙 + 이유" 형태
- **문서별 분리 생성**: 7개 기본 문서를 각각 독립적으로 생성하여 토큰 한도 내에서 처리

### 2.4 Phase 4 Prompt 생성 프롬프트 방향

Phase 4는 Phase 2의 analysis.json + Phase 3의 디자인 스펙 문서를 입력으로 받아 AI Coding Agent용 단계별 Prompt를 생성한다.

**프롬프트 전략:**
- **역할**: "AI Coding Agent를 위한 구현 지시문 전문 작성자"
- **2단계 생성**:
  1. **계획 단계**: 전체 분석 결과를 보고, 몇 단계로 나눌지/각 단계의 범위를 결정 (분할 규칙 적용)
  2. **생성 단계**: 각 Step Prompt를 개별적으로 생성
- **핵심 지시**:
  - 자기 완결성: 각 Prompt에 필요한 디자인 토큰/스펙을 인라인 포함
  - 구체성: "적절하게 스타일링하세요" 같은 모호한 지시 금지, 구체적 값/패턴 포함
  - Agent 중립성: 특정 도구(Claude Code, Cursor 등) 전용 지시 금지
  - 에센스 반영: 값만 나열하지 않고 "왜 이렇게 하는지" 톤/무드 맥락 포함

### 2.5 프롬프트 버전 관리

프롬프트는 코드로 관리되며, 버전 추적이 가능해야 한다:

```
src/prompts/
├── system.ts                    # 공통 시스템 프롬프트 빌더
├── v1/                          # 프롬프트 버전 디렉토리
│   ├── analyzers/
│   │   ├── token.ts             # Token Analyzer 프롬프트
│   │   ├── component.ts
│   │   ├── layout.ts
│   │   ├── page.ts
│   │   ├── responsive.ts
│   │   ├── interaction.ts
│   │   └── essence.ts           # Essence Synthesizer 프롬프트
│   ├── generators/
│   │   ├── doc.ts               # Phase 3 문서 생성 프롬프트
│   │   └── prompt.ts            # Phase 4 Prompt 생성 프롬프트
│   └── index.ts                 # 버전 export
└── index.ts                     # 현재 활성 버전 export
```

**버전 관리 규칙:**
- 프롬프트 변경은 반드시 Git 커밋으로 추적
- 주요 프롬프트 개선 시 새 버전 디렉토리 생성 (`v2/`, `v3/`)
- `analysis.json`에 사용된 프롬프트 버전을 기록하여 재현 가능성 확보
- 벤치마크 레포 대상 A/B 비교 가능

---

## 3. 컨텍스트 관리 (핵심)

이 섹션은 Ditto의 가장 중요한 기술적 도전을 다룬다. FE 레포지토리의 코드를 LLM 컨텍스트 윈도우에 효과적으로 담아야 하며, 레포 규모에 관계없이 분석 품질을 유지해야 한다.

### 3.1 토큰 예산 배분 전략

GPT-5.2의 컨텍스트 윈도우(입력)를 기준으로, 단일 LLM 호출의 토큰 예산을 다음과 같이 배분한다:

```
총 입력 컨텍스트 예산 (1회 호출)
├── System Prompt          ~1,500 tokens (고정)
│   ├── 역할 정의
│   ├── 분석 원칙
│   └── 출력 규칙
│
├── Previous Analysis      ~2,000-8,000 tokens (가변)
│   └── 선행 분석기의 결과 요약 (Phase 2 후반 분석기, Phase 3/4에서 사용)
│
├── Code Context           나머지 전부 (핵심 — 최대화)
│   ├── 파일 구조 요약
│   ├── 관련 파일 내용
│   └── 설정 파일 내용
│
└── User Prompt            ~500 tokens (고정)
    └── 분석 지시 + 집중 포인트
```

**원칙: Code Context에 최대한 많은 예산을 할당한다.** System Prompt와 User Prompt는 간결하게 유지하고, 이전 분석 결과도 요약본만 전달한다.

### 3.2 코드 청킹 전략

#### 3.2.1 개요

FE 레포지토리의 모든 파일을 LLM에 전달할 수 없으므로, **분석기별로 관련도가 높은 파일을 우선 선택**하여 컨텍스트를 구성한다. 이 과정은 Phase 1(Extraction)에서 수집한 파일 메타데이터를 기반으로 한다.

```
Phase 1 (Extraction)
   │
   ├── 파일 목록 수집 (경로, 크기, 확장자)
   ├── 파일 분류 (카테고리 태깅)
   └── 기술 스택 감지
          │
          ▼
   컨텍스트 빌더 (LLM 호출 전)
   │
   ├── 분석기별 파일 우선순위 결정
   ├── 토큰 예산 내에서 파일 선택
   ├── 선택된 파일 내용 로드 + 청킹
   └── 최종 프롬프트 조립
```

#### 3.2.2 파일 분류 체계

Phase 1에서 모든 파일을 아래 카테고리로 분류한다:

```typescript
// src/extraction/file-classifier.ts
export type FileCategory =
  | "config-styling"     // tailwind.config, postcss.config, stylelint 등
  | "config-framework"   // next.config, vite.config, tsconfig 등
  | "config-package"     // package.json
  | "styling-global"     // globals.css, base.css, reset.css
  | "styling-theme"      // theme.ts, design-tokens.ts, CSS Variable 정의
  | "styling-component"  // *.module.css, styled-components 파일
  | "component-ui"       // components/ui/, primitives
  | "component-layout"   // layout.tsx, header, footer, sidebar
  | "component-page"     // page sections, features 등
  | "component-composite"// 복합 컴포넌트
  | "page-route"         // pages/, app/ 라우트 파일
  | "animation"          // 애니메이션 관련 코드, motion 설정
  | "utility"            // utils, hooks, helpers
  | "asset"              // 이미지, 폰트, SVG
  | "other"              // 분류 불가

export interface ClassifiedFile {
  path: string
  category: FileCategory
  sizeBytes: number
  estimatedTokens: number  // 대략적 토큰 수 추정 (bytes / 4)
}
```

**분류 규칙 (경로 패턴 + 내용 기반):**

| 카테고리 | 경로 패턴 예시 | 내용 힌트 |
|---------|--------------|-----------|
| `config-styling` | `tailwind.config.*`, `postcss.config.*` | — |
| `styling-global` | `**/globals.css`, `**/global.css`, `**/base.css` | `:root`, `@layer base` |
| `styling-theme` | `**/theme.*`, `**/tokens.*`, `**/design-tokens.*` | CSS Variables 정의, theme 객체 |
| `component-ui` | `**/components/ui/**`, `**/primitives/**` | — |
| `component-layout` | `**/layout.*`, `**/header.*`, `**/footer.*`, `**/sidebar.*` | — |
| `page-route` | `**/pages/**`, `**/app/**/page.*` | — |
| `animation` | — | `framer-motion`, `gsap`, `@keyframes`, `transition` 다수 |

#### 3.2.3 분석기별 파일 우선순위

각 분석기가 주로 필요로 하는 파일 카테고리를 정의하고, 우선순위에 따라 컨텍스트를 채운다:

```typescript
// src/llm/context-builder.ts
export const ANALYZER_FILE_PRIORITIES: Record<string, FileCategory[]> = {
  token: [
    "config-styling",    // tailwind.config — 최우선
    "styling-theme",     // CSS Variables, theme 객체
    "styling-global",    // 글로벌 CSS
    "config-package",    // UI 라이브러리 확인용
    "styling-component", // 컴포넌트 스타일에서 패턴 추출
    "component-ui",      // 하드코딩 값 패턴 파악
  ],
  component: [
    "component-ui",
    "component-composite",
    "component-layout",
    "styling-component",
    "component-page",
  ],
  layout: [
    "component-layout",
    "page-route",
    "styling-global",
    "component-page",
  ],
  page: [
    "page-route",
    "component-layout",
    "component-page",
  ],
  responsive: [
    "config-styling",    // breakpoint 정의
    "styling-global",    // 미디어 쿼리
    "component-layout",  // 반응형 레이아웃
    "styling-component",
  ],
  interaction: [
    "animation",
    "component-ui",      // hover/transition 패턴
    "component-composite",
    "styling-global",    // @keyframes
    "config-package",    // 애니메이션 라이브러리 확인
  ],
}
```

#### 3.2.4 컨텍스트 빌딩 알고리즘

```typescript
// src/llm/context-builder.ts
export interface ContextBuildResult {
  files: SelectedFile[]
  fileStructureSummary: string
  totalTokens: number
  truncatedFiles: string[]  // 토큰 한도로 포함 못한 파일
}

export interface SelectedFile {
  path: string
  content: string
  category: FileCategory
  estimatedTokens: number
  truncated: boolean
}

export function buildContextForAnalyzer(
  analyzer: string,
  classifiedFiles: ClassifiedFile[],
  tokenBudget: number,
): ContextBuildResult {
  const priorities = ANALYZER_FILE_PRIORITIES[analyzer]
  const selected: SelectedFile[] = []
  let remainingBudget = tokenBudget

  // 1단계: 파일 구조 요약 (항상 포함, ~200-500 tokens)
  const structureSummary = buildFileStructureSummary(classifiedFiles)
  const structureTokens = estimateTokens(structureSummary)
  remainingBudget -= structureTokens

  // 2단계: 우선순위 카테고리 순서대로 파일 추가
  for (const category of priorities) {
    const categoryFiles = classifiedFiles
      .filter((f) => f.category === category)
      .sort((a, b) => a.sizeBytes - b.sizeBytes)  // 작은 파일 우선 (더 많은 파일 포함)

    for (const file of categoryFiles) {
      if (remainingBudget <= 0) break

      if (file.estimatedTokens <= remainingBudget) {
        // 파일 전체 포함
        selected.push({
          path: file.path,
          content: readFileContent(file.path),
          category: file.category,
          estimatedTokens: file.estimatedTokens,
          truncated: false,
        })
        remainingBudget -= file.estimatedTokens
      } else if (remainingBudget > 500) {
        // 남은 예산이 500 토큰 이상이면 파일을 잘라서 포함
        const truncatedContent = truncateFile(file.path, remainingBudget)
        selected.push({
          path: file.path,
          content: truncatedContent,
          category: file.category,
          estimatedTokens: remainingBudget,
          truncated: true,
        })
        remainingBudget = 0
      }
    }
  }

  return {
    files: selected,
    fileStructureSummary: structureSummary,
    totalTokens: tokenBudget - remainingBudget,
    truncatedFiles: selected.filter((f) => f.truncated).map((f) => f.path),
  }
}
```

#### 3.2.5 파일 크기 기반 청킹

개별 파일이 클 경우의 처리 전략:

| 파일 추정 토큰 | 전략 |
|--------------|------|
| < 2,000 | 전체 포함 |
| 2,000 ~ 8,000 | 전체 포함하되, 동일 카테고리의 후순위 파일 희생 |
| 8,000 ~ 20,000 | 관련 섹션만 추출 (아래 규칙 적용) |
| > 20,000 | 핵심 섹션 추출 + 구조 요약 |

**대형 파일 섹션 추출 규칙:**

```typescript
// src/llm/file-truncation.ts

/**
 * 대형 파일에서 분석기별 관련 섹션만 추출한다.
 *
 * - tailwind.config: theme.extend 섹션 위주
 * - 글로벌 CSS: :root 변수 정의, @layer base, @keyframes
 * - 컴포넌트 파일: export된 컴포넌트 함수/클래스 + 스타일 관련 코드
 * - 페이지 파일: 최상위 JSX 구조 (중첩 로직 제거)
 */
export function extractRelevantSections(
  content: string,
  filePath: string,
  category: FileCategory,
  maxTokens: number,
): string {
  // 구현은 카테고리별 정규식 + AST-free 휴리스틱 기반
  // ...
}
```

**tailwind.config 추출 예시:**
- `theme.extend` 블록 전체 (컬러, 간격, 폰트 등 디자인 토큰)
- `plugins` 목록 (커스텀 플러그인 확인)
- `content` 경로 (파일 범위 파악)
- `screens` (breakpoint 정의)

**컴포넌트 파일 추출 예시:**
- import 문 (의존성 파악)
- 컴포넌트 함수 시그니처 + Props 타입
- JSX return 문 (스타일 클래스, 구조)
- 비즈니스 로직 (useEffect, 이벤트 핸들러 내부) 제거

#### 3.2.6 대형 레포 샘플링 전략

파일 수가 매우 많은 레포(예: 컴포넌트 100개 이상)에서는 모든 파일을 분석할 수 없다. 이때 **대표 샘플링**을 적용한다:

```typescript
// src/llm/sampling.ts

export interface SamplingConfig {
  /** 카테고리당 최대 파일 수 */
  maxFilesPerCategory: number
  /** 전체 최대 파일 수 */
  maxTotalFiles: number
  /** 샘플링 전략 */
  strategy: "representative" | "random"
}

export const DEFAULT_SAMPLING: SamplingConfig = {
  maxFilesPerCategory: 15,
  maxTotalFiles: 50,
  strategy: "representative",
}
```

**Representative 샘플링 알고리즘:**

```
1. 설정/스타일 파일: 전수 포함 (config-*, styling-* 카테고리)
   → 이 파일들은 보통 소수이며, 디자인 토큰의 원천이므로 절대 생략 불가

2. 컴포넌트 파일: 대표 샘플 선정
   a. 카테고리별 그룹핑 (ui, layout, composite, page)
   b. 각 카테고리 내에서 다양성 최대화:
      - 파일 크기 기준 상/중/하 균등 선택 (복잡도 다양성)
      - 서로 다른 디렉토리에서 선택 (구조 다양성)
      - import 관계에서 허브 역할 파일 우선 (많이 사용되는 컴포넌트)

3. 페이지 파일: 메인 페이지 우선
   a. index/home 페이지 필수 포함
   b. 라우트 깊이가 얕은 페이지 우선 (주요 페이지일 확률 높음)
   c. 파일 크기가 큰 페이지 우선 (구성이 풍부한 페이지)

4. 샘플링 결과를 사용자에게 알림:
   "총 142개 파일 중 48개를 샘플링하여 분석합니다.
    설정/스타일: 12개(전수), 컴포넌트: 24개(82개 중), 페이지: 8개(15개 중), 기타: 4개"
```

**import 관계 기반 허브 탐지:**

```typescript
// src/extraction/import-graph.ts

/**
 * 간단한 import 그래프를 구축하여 "허브" 파일을 찾는다.
 * 허브 = 다른 파일에서 많이 import하는 파일 (공용 컴포넌트일 확률 높음)
 *
 * 전체 AST 파싱 없이, import/from 문의 정규식 매칭으로 경량 구현한다.
 */
export function findHubFiles(
  files: ClassifiedFile[],
  maxHubs: number,
): string[] {
  // import "from './components/Button'" 패턴 매칭
  // 각 파일의 인바운드 참조 수 카운트
  // 상위 N개 반환
}
```

#### 3.2.7 파일 구조 요약

모든 분석기 호출에 파일 구조 요약을 포함하여, LLM이 프로젝트의 전체 맥락을 파악할 수 있게 한다:

```typescript
// src/llm/context-builder.ts

/**
 * 프로젝트 파일 구조를 트리 형태로 요약한다.
 * 디렉토리 3단계까지만 표시하고, 파일 수가 많은 디렉토리는 카운트로 축약.
 *
 * 예시 출력:
 * ```
 * src/
 *   components/
 *     ui/ (12 files)
 *     layout/ (4 files)
 *   pages/ (6 files)
 *   styles/
 *     globals.css
 *     theme.ts
 * tailwind.config.ts
 * package.json
 * ```
 */
function buildFileStructureSummary(
  files: ClassifiedFile[],
): string {
  // ...
}
```

### 3.3 Phase 간 컨텍스트 전달

Phase 2의 분석 결과를 Phase 3/4에 전달하는 방법:

```
Phase 2 (Analysis)
   │
   ├── Token Analyzer      → TokenAnalysisResult
   ├── Component Analyzer   → ComponentAnalysisResult
   ├── Layout Analyzer      → LayoutAnalysisResult
   ├── Page Analyzer        → PageAnalysisResult
   ├── Responsive Analyzer  → ResponsiveAnalysisResult
   ├── Interaction Analyzer → InteractionAnalysisResult
   └── Essence Synthesizer  → EssenceSynthesisResult
          │
          ▼
   analysis.json (디스크에 저장)
          │
          ├───→ Phase 3: 관련 섹션만 추출하여 각 문서 생성 프롬프트에 전달
          └───→ Phase 4: 전체 요약 + 관련 섹션을 각 Step Prompt 생성에 전달
```

**Phase 2 내부 — 분석기 간 전달:**

```typescript
// Essence Synthesizer는 모든 분석 결과를 입력으로 받음
const essenceResult = await callLLM({
  // ...
  prompt: buildEssencePrompt({
    tokens: tokenAnalysisResult,
    components: componentAnalysisResult,
    layout: layoutAnalysisResult,
    pages: pageAnalysisResult,
    responsive: responsiveAnalysisResult,
    interactions: interactionAnalysisResult,
  }),
  schema: essenceSynthesisSchema,
})
```

Essence Synthesizer에 전달할 때, 각 분석 결과를 **요약 형태**로 변환하여 토큰 예산 내에 맞춘다:

```typescript
// src/llm/context-summarizer.ts

/**
 * 분석 결과를 요약하여 Essence Synthesizer나 Phase 3/4에 전달할 수 있는
 * 축약 형태로 변환한다.
 *
 * 전략:
 * - confidence가 low인 항목은 한 줄로 축약
 * - 반복적 패턴은 대표 예시 1-2개 + "외 N개" 형태
 * - 수치 데이터(토큰 값)는 유지, 서술은 핵심문만
 */
export function summarizeForContext(
  analysisResult: AnalysisResult,
  maxTokens: number,
): string {
  // ...
}
```

**Phase 3/4 — 문서별 관련 데이터 전달:**

```typescript
// Phase 3: 01-design-tokens.md 생성 시
const doc = await callLLM({
  // ...
  prompt: buildDocPrompt("design-tokens", {
    // analysis.json에서 관련 섹션만 추출
    tokens: analysisResult.tokens,
    essence: analysisResult.essence,  // Do's & Don'ts, 톤/무드
    // components, pages 등은 이 문서에 불필요하므로 제외
  }),
  schema: designTokensDocSchema,
})
```

---

## 4. 비용 최적화

### 4.1 Phase별 모델 분리 가능성

| Phase | LLM 사용 | 모델 전략 |
|-------|---------|----------|
| Phase 1 (Extraction) | **불필요** | 파일 시스템 탐색 + 정규식 기반 분류 — LLM 비용 0 |
| Phase 2 (Analysis) | **필수** | 기본 모델(GPT-5.2). Token/Responsive Analyzer는 더 저렴한 모델 가능 |
| Phase 3 (Documentation) | **필수** | 기본 모델. 자연어 품질이 중요하므로 모델 다운그레이드 주의 |
| Phase 4 (Prompt Gen) | **필수** | 기본 모델. 구체성과 정확성이 중요 |

**Phase 2 분석기별 모델 최적화 가능성:**

| 분석기 | 고급 모델 필요도 | 이유 |
|-------|----------------|------|
| Token Analyzer | 중간 | 정량적 추출 위주 — 소형 모델로도 가능할 수 있음 |
| Component Analyzer | 높음 | 디자인 특징 서술에 높은 언어 능력 필요 |
| Layout Analyzer | 중간 | 패턴 인식 + 구조 서술 |
| Page Analyzer | 중간 | 구성 분석 |
| Responsive Analyzer | 낮음 | 정량적 breakpoint 추출 위주 |
| Interaction Analyzer | 중간 | 모션 성격 서술에 어느 정도 언어 능력 필요 |
| Essence Synthesizer | **높음** | 종합적 해석, 창의적 서술 — 최고 모델 사용 |

v1에서는 모든 분석기에 동일 모델을 사용하되, `--model` 옵션으로 전체 변경 가능. v1 이후 분석기별 모델 지정 옵션 검토.

### 4.2 캐싱 전략

```typescript
// src/cache/analysis-cache.ts

/**
 * analysis.json 기반 캐싱.
 *
 * Phase 2 완료 후 analysis.json이 저장되므로:
 * - --docs-only: Phase 2 스킵, analysis.json에서 Phase 3만 실행
 * - --prompts-only: Phase 2/3 스킵, 기존 문서 기반 Phase 4만 실행
 *
 * 파일 변경 감지:
 * - Phase 1에서 파일 해시(SHA-256)를 계산하여 analysis.json에 기록
 * - 재분석 시 해시 비교로 변경된 파일이 없으면 Phase 2 스킵 가능
 */
export interface AnalysisCache {
  version: string          // Ditto 버전
  promptVersion: string    // 프롬프트 버전 (v1, v2, ...)
  modelId: string          // 사용된 모델
  timestamp: string        // 분석 시각
  fileHashes: Record<string, string>  // 파일 경로 → SHA-256
  result: AnalysisResult   // 분석 결과
}
```

**프롬프트 레벨 캐싱은 의도적으로 제외한다:**
- LLM 호출의 입력이 매번 다르므로(파일 내용이 다름) 히트율이 매우 낮음
- OpenAI/Anthropic의 서버사이드 Prompt Caching이 동일 시스템 프롬프트에 대해 자동 적용되므로 별도 구현 불필요

### 4.3 토큰 사용량 추적/로깅

```typescript
// src/llm/usage-tracker.ts
import consola from "consola"

export interface TokenUsage {
  phase: string
  analyzer: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
  durationMs: number
}

export class UsageTracker {
  private records: TokenUsage[] = []

  record(usage: TokenUsage): void {
    this.records.push(usage)
    consola.debug(
      `[${usage.phase}/${usage.analyzer}] ${usage.model}: ` +
      `${usage.inputTokens} in + ${usage.outputTokens} out = ${usage.totalTokens} tokens ` +
      `(~$${usage.estimatedCostUsd.toFixed(4)}, ${usage.durationMs}ms)`,
    )
  }

  getSummary(): UsageSummary {
    return {
      totalInputTokens: sum(this.records, "inputTokens"),
      totalOutputTokens: sum(this.records, "outputTokens"),
      totalTokens: sum(this.records, "totalTokens"),
      totalEstimatedCostUsd: sum(this.records, "estimatedCostUsd"),
      totalDurationMs: sum(this.records, "durationMs"),
      byPhase: groupBy(this.records, "phase"),
      byAnalyzer: groupBy(this.records, "analyzer"),
    }
  }

  printSummary(): void {
    const s = this.getSummary()
    consola.info("─── LLM Usage Summary ───")
    consola.info(`Total tokens: ${s.totalTokens.toLocaleString()}`)
    consola.info(`Estimated cost: $${s.totalEstimatedCostUsd.toFixed(4)}`)
    consola.info(`Total duration: ${(s.totalDurationMs / 1000).toFixed(1)}s`)
    consola.info("")

    for (const [phase, records] of Object.entries(s.byPhase)) {
      const phaseTotal = sum(records, "totalTokens")
      const phaseCost = sum(records, "estimatedCostUsd")
      consola.info(`  ${phase}: ${phaseTotal.toLocaleString()} tokens (~$${phaseCost.toFixed(4)})`)
    }
  }
}
```

`generateObject()` 반환 값의 `usage` 필드에서 토큰 사용량을 추출한다:

```typescript
const result = await generateObject({ /* ... */ })

usageTracker.record({
  phase: "phase2",
  analyzer: "token",
  model: result.response.modelId,
  inputTokens: result.usage.promptTokens,
  outputTokens: result.usage.completionTokens,
  totalTokens: result.usage.totalTokens,
  estimatedCostUsd: estimateCost(result.usage, result.response.modelId),
  durationMs: elapsed,
})
```

CLI 실행 완료 시 사용량 요약을 출력한다:

```
─── LLM Usage Summary ───
Total tokens: 127,482
Estimated cost: $0.3842
Total duration: 45.2s

  phase2: 89,210 tokens (~$0.2415)
  phase3: 28,104 tokens (~$0.0984)
  phase4: 10,168 tokens (~$0.0443)
```

---

## 5. 코드 예시 — 실제 구현 패턴

### 5.1 분석기 스키마 정의

```typescript
// src/schemas/token-analysis.ts
import { z } from "zod"

const confidenceLevel = z.enum(["high", "medium", "low"])

const colorTokenSchema = z.object({
  name: z.string().describe("토큰 이름 (예: primary, background)"),
  value: z.string().describe("색상 값 (예: #1E40AF, hsl(220 70% 50%))"),
  usage: z.string().describe("사용 맥락 (예: 주요 CTA, 기본 배경)"),
  confidence: confidenceLevel,
})

const colorPaletteSchema = z.object({
  primary: z.array(colorTokenSchema),
  neutral: z.array(colorTokenSchema),
  semantic: z.array(colorTokenSchema),
  mood: z.string().describe("컬러 팔레트의 전체적인 톤/무드 (예: '차분하고 신뢰감 있는 네이비 기반 팔레트')"),
  dominantRatio: z.string().describe("색상 사용 비율 설명 (예: '배경 흰색 70%, 네이비 포인트 15%, 그레이 텍스트 15%')"),
})

const spacingScaleSchema = z.object({
  scale: z.array(z.object({
    name: z.string(),
    value: z.string(),
    usage: z.string(),
  })),
  density: z.enum(["compact", "normal", "spacious"]).describe("여백 밀도"),
  philosophy: z.string().describe("간격 사용 철학 (예: '콘텐츠 사이 충분한 호흡을 주는 spacious 스타일')"),
  confidence: confidenceLevel,
})

export const tokenAnalysisSchema = z.object({
  colors: colorPaletteSchema,
  spacing: spacingScaleSchema,
  borderRadius: z.object({
    scale: z.array(z.object({ name: z.string(), value: z.string() })),
    character: z.string().describe("형태 성격 (예: '부드러운 곡선 위주, 완전한 pill 형태도 사용')"),
    confidence: confidenceLevel,
  }),
  shadows: z.object({
    scale: z.array(z.object({ name: z.string(), value: z.string(), usage: z.string() })),
    depthStyle: z.string().describe("깊이 스타일 (예: '미니멀한 그림자로 은은한 입체감')"),
    confidence: confidenceLevel,
  }),
  borders: z.object({
    patterns: z.array(z.object({ description: z.string(), value: z.string() })),
    confidence: confidenceLevel,
  }),
  darkMode: z.object({
    supported: z.boolean(),
    strategy: z.string().optional().describe("다크모드 전환 전략"),
    tokenMapping: z.string().optional().describe("토큰 매핑 설명"),
  }),
})

export type TokenAnalysisResult = z.infer<typeof tokenAnalysisSchema>
```

### 5.2 분석기 실행 전체 흐름

```typescript
// src/analyzers/token-analyzer.ts
import { callLLM } from "../llm/client"
import { buildContextForAnalyzer } from "../llm/context-builder"
import { buildSystemPrompt, SHARED_PRINCIPLES, SHARED_OUTPUT_RULES } from "../prompts/system"
import { tokenAnalysisSchema } from "../schemas/token-analysis"
import type { ClassifiedFile } from "../extraction/file-classifier"
import type { ModelConfig } from "../llm/types"

export async function analyzeTokens(
  classifiedFiles: ClassifiedFile[],
  modelConfig: ModelConfig,
  tokenBudget: number,
): Promise<TokenAnalysisResult> {
  // 1. 컨텍스트 빌드 — 토큰 분석에 필요한 파일 선택
  const context = buildContextForAnalyzer(
    "token",
    classifiedFiles,
    tokenBudget,
  )

  // 2. 시스템 프롬프트 조립
  const system = buildSystemPrompt({
    role: "당신은 FE 프로젝트의 디자인 토큰을 분석하는 전문가입니다. 코드에서 디자인 토큰 체계를 추출하고, 각 토큰이 주는 시각적 인상을 해석합니다.",
    principles: [
      ...SHARED_PRINCIPLES,
      "명시적으로 정의된 토큰(tailwind.config, CSS Variables, theme 객체)은 정확하게 추출하라.",
      "하드코딩된 값만 있는 경우, 반복 패턴에서 토큰 체계를 추론하라.",
      "모든 토큰 카테고리에 대해 값뿐만 아니라 '톤/무드/성격'을 자연어로 설명하라.",
    ],
    outputRules: SHARED_OUTPUT_RULES,
  })

  // 3. 유저 프롬프트 — 파일 컨텍스트 포함
  const prompt = [
    "다음 FE 프로젝트의 디자인 토큰 체계를 분석하세요.",
    "",
    "## 프로젝트 파일 구조",
    context.fileStructureSummary,
    "",
    "## 분석 대상 파일",
    ...context.files.map((f) =>
      `### ${f.path}${f.truncated ? " (일부 발췌)" : ""}\n\`\`\`\n${f.content}\n\`\`\``
    ),
    "",
    context.truncatedFiles.length > 0
      ? `> 토큰 한도로 포함하지 못한 파일: ${context.truncatedFiles.join(", ")}`
      : "",
  ].join("\n")

  // 4. LLM 호출
  const result = await callLLM({
    ...modelConfig,
    system,
    prompt,
    schema: tokenAnalysisSchema,
    schemaName: "TokenAnalysis",
    schemaDescription: "FE 프로젝트의 디자인 토큰 분석 결과",
  })

  return result
}
```

### 5.3 에러 핸들링 패턴

```typescript
// src/analyzers/run-all.ts
import { APICallError, RetryError } from "ai"
import consola from "consola"

export async function runAnalysis(
  classifiedFiles: ClassifiedFile[],
  config: AnalysisConfig,
): Promise<AnalysisResult> {
  const results: Partial<AnalysisResult> = {}

  // 독립적인 분석기는 병렬 실행
  const parallelResults = await Promise.allSettled([
    analyzeTokens(classifiedFiles, config.modelConfig, config.tokenBudget),
    analyzeComponents(classifiedFiles, config.modelConfig, config.tokenBudget),
    analyzeLayout(classifiedFiles, config.modelConfig, config.tokenBudget),
    analyzePages(classifiedFiles, config.modelConfig, config.tokenBudget),
    analyzeResponsive(classifiedFiles, config.modelConfig, config.tokenBudget),
    analyzeInteractions(classifiedFiles, config.modelConfig, config.tokenBudget),
  ])

  const analyzerNames = [
    "tokens", "components", "layout", "pages", "responsive", "interactions",
  ] as const

  for (let i = 0; i < parallelResults.length; i++) {
    const settled = parallelResults[i]
    const name = analyzerNames[i]

    if (settled.status === "fulfilled") {
      results[name] = settled.value
    } else {
      const error = settled.reason
      handleAnalyzerError(name, error)
      // 개별 분석기 실패 시 해당 섹션을 null로 두고 계속 진행 (Graceful Degradation)
      results[name] = null
    }
  }

  // Essence Synthesizer는 이전 분석 결과에 의존하므로 순차 실행
  if (hasEnoughResults(results)) {
    try {
      results.essence = await synthesizeEssence(results, config.modelConfig)
    } catch (error) {
      handleAnalyzerError("essence", error)
      // Essence 실패는 치명적 — 사용자에게 재시도 안내
      throw new DittoError(
        "ESSENCE_SYNTHESIS_FAILED",
        "디자인 에센스 종합에 실패했습니다. --retry 옵션으로 재시도해주세요.",
        { cause: error },
      )
    }
  } else {
    throw new DittoError(
      "INSUFFICIENT_ANALYSIS",
      "분석 결과가 충분하지 않아 에센스 종합이 불가합니다. 개별 분석기 오류를 확인해주세요.",
    )
  }

  return results as AnalysisResult
}

function handleAnalyzerError(name: string, error: unknown): void {
  if (error instanceof APICallError) {
    consola.error(
      `[${name}] API 오류 (${error.statusCode}): ${error.message}`,
    )
    if (error.statusCode === 401) {
      consola.error("API 키를 확인해주세요.")
    }
  } else if (error instanceof RetryError) {
    consola.error(
      `[${name}] 최대 재시도 초과: ${error.message}`,
    )
  } else if (error instanceof Error && error.name === "AbortError") {
    consola.error(
      `[${name}] 타임아웃: 응답 시간이 너무 깁니다. 컨텍스트 크기를 줄여보세요.`,
    )
  } else {
    consola.error(`[${name}] 알 수 없는 오류:`, error)
  }
}
```

### 5.4 전체 파이프라인 조합

```typescript
// src/pipeline.ts
import consola from "consola"
import { UsageTracker } from "./llm/usage-tracker"

export async function runPipeline(input: PipelineInput): Promise<void> {
  const tracker = new UsageTracker()

  // Phase 1: Extraction — LLM 사용 없음
  consola.start("Phase 1: 코드 추출 중...")
  const extracted = await extractFromRepo(input.repoPath)
  const classified = classifyFiles(extracted)
  const healthCheck = checkHealth(classified)

  if (healthCheck.status === "fail") {
    consola.error(`분석 불가: ${healthCheck.reason}`)
    return
  }
  if (healthCheck.status === "warn") {
    consola.warn(`주의: ${healthCheck.reason}`)
  }
  consola.success(`Phase 1 완료: ${classified.length}개 파일 분류됨`)

  // Phase 2: Analysis — LLM 핵심 구간
  consola.start("Phase 2: 디자인 분석 중...")
  const analysisResult = await runAnalysis(classified, {
    modelConfig: input.modelConfig,
    tokenBudget: input.tokenBudget,
    usageTracker: tracker,
  })
  await saveAnalysisJson(analysisResult, input.outputDir)
  consola.success("Phase 2 완료: analysis.json 저장됨")

  // Phase 3: Documentation
  consola.start("Phase 3: 디자인 스펙 문서 생성 중...")
  await generateDesignSpecDocs(analysisResult, {
    modelConfig: input.modelConfig,
    outputDir: input.outputDir,
    usageTracker: tracker,
  })
  consola.success("Phase 3 완료: design-spec/ 생성됨")

  // Phase 4: Prompt Generation
  consola.start("Phase 4: 구현 Prompt 생성 중...")
  await generateImplementationPrompts(analysisResult, {
    modelConfig: input.modelConfig,
    outputDir: input.outputDir,
    usageTracker: tracker,
  })
  consola.success("Phase 4 완료: prompts/ 생성됨")

  // 사용량 요약 출력
  tracker.printSummary()
}
```
