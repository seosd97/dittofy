# 01. Architecture — 시스템 아키텍처

## 1. 디렉토리 구조

```
src/
├── cli/                          # CLI 진입점, 명령어 정의 (citty)
│   ├── index.ts                  #   메인 CLI 정의, main command 등록
│   ├── commands/
│   │   ├── analyze.ts            #   `ditto analyze` 명령어 — 전체 파이프라인 실행
│   │   └── config.ts             #   `ditto config` 명령어 — API 키 등 설정 관리
│   └── formatter.ts              #   CLI 출력 포맷팅 (요약, 진행 상태 표시)
│
├── pipeline/                     # 4-Phase 오케스트레이터
│   ├── orchestrator.ts           #   Phase 순차 실행, 단계별 결과 전달
│   ├── context.ts                #   PipelineContext — Phase 간 공유 상태
│   └── health-check.ts           #   Pre-analysis Health Check (pass/warn/fail)
│
├── phases/
│   ├── extraction/               # Phase 1: Extraction — 원시 데이터 수집
│   │   ├── index.ts              #   Phase 1 진입점 (ExtractedData 반환)
│   │   ├── repo-resolver.ts      #   입력(로컬 경로/GitHub URL) → 로컬 디렉토리 확보 (giget)
│   │   ├── file-scanner.ts       #   파일 트리 스캔, FE 관련 파일 필터링 (tinyglobby)
│   │   ├── code-extractor.ts     #   컴포넌트 코드, 스타일 코드 추출
│   │   ├── config-extractor.ts   #   tailwind.config, package.json, tsconfig 등 설정 추출
│   │   └── asset-extractor.ts    #   폰트, 아이콘 등 에셋 메타데이터 추출
│   │
│   ├── analysis/                 # Phase 2: Analysis — LLM 기반 디자인 분석
│   │   ├── index.ts              #   Phase 2 진입점 (AnalysisResult 반환)
│   │   ├── tech-stack-detector.ts#   프레임워크, 스타일링, UI 라이브러리 감지
│   │   ├── analyzers/
│   │   │   ├── token-analyzer.ts       # 디자인 토큰 분석 (Color, Spacing, Shadow 등)
│   │   │   ├── typography-analyzer.ts  # 타이포그래피 분석
│   │   │   ├── component-analyzer.ts   # 컴포넌트 구조 & 패턴 분석
│   │   │   ├── layout-analyzer.ts      # 레이아웃 시스템 분석
│   │   │   ├── page-analyzer.ts        # 페이지 구성 분석
│   │   │   ├── responsive-analyzer.ts  # 반응형 전략 분석
│   │   │   └── interaction-analyzer.ts # 인터랙션 & 애니메이션 분석
│   │   └── essence-synthesizer.ts#   전체 분석 결과 종합 → DesignEssence 도출
│   │
│   ├── documentation/            # Phase 3: Documentation — 디자인 스펙 문서 생성
│   │   ├── index.ts              #   Phase 3 진입점 (GeneratedDocuments 반환)
│   │   ├── doc-planner.ts        #   분석 결과 기반 문서 구성 결정 (동적 문서 포함/제외)
│   │   ├── generators/
│   │   │   ├── overview-gen.ts         # 00-overview.md 생성
│   │   │   ├── tokens-gen.ts           # 01-design-tokens.md 생성
│   │   │   ├── typography-gen.ts       # 02-typography.md 생성
│   │   │   ├── components-gen.ts       # 03-component-catalog.md 생성
│   │   │   ├── layout-gen.ts           # 04-layout-system.md 생성
│   │   │   ├── pages-gen.ts            # 05-page-structures.md 생성
│   │   │   ├── responsive-gen.ts       # 06-responsive-strategy.md 생성
│   │   │   ├── interactions-gen.ts     # 07-interactions.md 생성
│   │   │   └── dynamic-gen.ts          # 동적 추가 문서 생성 (dark-mode, form 등)
│   │   └── writer.ts             #   파일 시스템 출력 (design-spec/ 디렉토리)
│   │
│   └── prompt-gen/               # Phase 4: Prompt Generation — AI Agent용 Prompt 생성
│       ├── index.ts              #   Phase 4 진입점 (GeneratedPrompts 반환)
│       ├── step-planner.ts       #   분석 복잡도 기반 단계 수/분할 계획
│       ├── context-injector.ts   #   각 Prompt에 필요한 디자인 정보 선별 삽입
│       ├── generators/
│       │   ├── setup-prompt.ts         # step-01-project-setup.md
│       │   ├── design-system-prompt.ts # step-02-design-system.md
│       │   ├── components-prompt.ts    # step-03~05 컴포넌트 관련 Prompt
│       │   ├── pages-prompt.ts         # step-06 페이지 구현 Prompt
│       │   ├── responsive-prompt.ts    # step-07 반응형 Prompt
│       │   ├── interactions-prompt.ts  # step-08 인터랙션 Prompt
│       │   └── readme-gen.ts           # prompts/README.md 사용 가이드
│       └── writer.ts             #   파일 시스템 출력 (prompts/ 디렉토리)
│
├── llm/                          # LLM 클라이언트 추상화 (Vercel AI SDK)
│   ├── client.ts                 #   LLM 클라이언트 생성 (프로바이더 선택, 모델 설정)
│   ├── schemas/                  #   Zod 스키마 — generateObject()용
│   │   ├── extraction.ts         #     Phase 1 관련 스키마
│   │   ├── analysis.ts           #     Phase 2 분석 결과 스키마
│   │   ├── documentation.ts      #     Phase 3 문서 생성 스키마
│   │   └── prompts.ts            #     Phase 4 Prompt 생성 스키마
│   ├── prompts/                  #   LLM 시스템/유저 프롬프트 템플릿
│   │   ├── analysis-prompts.ts   #     분석용 프롬프트 (토큰, 컴포넌트, 레이아웃 등)
│   │   ├── doc-prompts.ts        #     문서 생성용 프롬프트
│   │   └── prompt-gen-prompts.ts #     Prompt 생성용 메타 프롬프트
│   └── retry.ts                  #   재시도 로직, rate limit 대응
│
├── config/                       # 설정 관리 (c12)
│   ├── loader.ts                 #   c12 기반 설정 로드 (ditto.config.ts, 환경변수, CLI args 머지)
│   ├── defaults.ts               #   기본 설정값 정의
│   └── schema.ts                 #   설정 스키마 (Zod 검증)
│
├── types/                        # 공유 타입 정의
│   ├── config.ts                 #   DittoConfig, ModelConfig
│   ├── extraction.ts             #   ExtractedData, FileInfo, RepoMeta
│   ├── analysis.ts               #   AnalysisResult, DesignTokens, ComponentInfo, DesignEssence
│   ├── documentation.ts          #   GeneratedDocuments, DocumentPlan
│   ├── prompts.ts                #   GeneratedPrompts, StepPlan, PromptStep
│   ├── pipeline.ts               #   PipelineContext, PhaseResult, HealthCheckResult
│   └── errors.ts                 #   UserError, SystemError, LLMError 정의
│
└── utils/                        # 공통 유틸리티
    ├── logger.ts                 #   consola 래퍼 — 로그 레벨, 디버그 모드
    ├── fs.ts                     #   파일 읽기/쓰기 헬퍼
    ├── path.ts                   #   경로 정규화, 출력 디렉토리 결정
    └── progress.ts               #   진행 상태 표시 (consola 스피너 래퍼)
```

---

## 2. 모듈 의존성 그래프

### 2.1 전체 의존성 방향

```
                          ┌──────────┐
                          │  cli/    │
                          └────┬─────┘
                               │ 호출
                               ▼
                        ┌──────────────┐
                        │  pipeline/   │
                        │ orchestrator │
                        └──┬───┬───┬──┘
                           │   │   │
              ┌────────────┘   │   └────────────┐
              ▼                ▼                 ▼
     ┌──────────────┐  ┌────────────┐  ┌──────────────────┐
     │   phases/    │  │   llm/     │  │    config/       │
     │ extraction   │  │   client   │  │    loader        │
     │ analysis     │  │   schemas  │  └──────────────────┘
     │ documentation│  │   prompts  │
     │ prompt-gen   │  │   retry    │
     └──────┬───────┘  └─────┬──────┘
            │                │
            │    ┌───────────┘
            ▼    ▼
     ┌──────────────┐      ┌──────────────┐
     │   types/     │◄─────│   utils/     │
     │  (모든 모듈이  │      │  logger, fs  │
     │   import)    │      │  path, progress│
     └──────────────┘      └──────────────┘
```

### 2.2 Phase 간 의존성 (순방향만 허용)

```
Phase 1         Phase 2           Phase 3            Phase 4
Extraction  ──► Analysis      ──► Documentation  ──► Prompt Gen
(ExtractedData) (AnalysisResult)  (GeneratedDocuments) (GeneratedPrompts)
```

각 Phase는 이전 Phase의 **출력 타입만** 의존하며, 이전 Phase의 내부 구현에는 접근하지 않는다.

### 2.3 순환 의존성 방지 규칙

| 규칙 | 설명 |
|------|------|
| **단방향 호출** | `cli → pipeline → phases → llm` 방향으로만 호출. 역방향 import 금지. |
| **types/ 독립성** | `types/`는 어떤 모듈도 import하지 않는다. 순수 타입 정의만 포함. |
| **utils/ 독립성** | `utils/`는 `types/`만 import 가능. 다른 비즈니스 모듈 import 금지. |
| **Phase 간 격리** | `phases/analysis/`가 `phases/extraction/`의 내부 함수를 import하지 않는다. Phase 간 통신은 `types/`에 정의된 인터페이스(데이터 타입)로만 수행. |
| **llm/ 격리** | `llm/`은 `types/`와 `utils/`만 import. Phase 구현을 알지 못한다. |
| **config/ 격리** | `config/`는 `types/config.ts`만 import. 다른 비즈니스 로직 import 금지. |
| **Biome 검증** | Biome의 `noCircularDependencies` 규칙을 활성화하여 빌드 시 순환 참조 자동 검출. |

### 2.4 import 방향 요약 테이블

| 모듈 ↓ import → | types/ | utils/ | config/ | llm/ | phases/ | pipeline/ | cli/ |
|:-----------------|:------:|:------:|:-------:|:----:|:-------:|:---------:|:----:|
| **cli/**         | O      | O      | O       | -    | -       | O         | -    |
| **pipeline/**    | O      | O      | O       | O    | O       | -         | -    |
| **phases/**      | O      | O      | -       | O    | -       | -         | -    |
| **llm/**         | O      | O      | -       | -    | -       | -         | -    |
| **config/**      | O      | -      | -       | -    | -       | -         | -    |
| **utils/**       | O      | -      | -       | -    | -       | -         | -    |
| **types/**       | -      | -      | -       | -    | -       | -         | -    |

> `O` = import 허용, `-` = import 금지

---

## 3. 데이터 흐름도

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          사용자 입력                                      │
│  ditto analyze ./path/to/repo                                            │
│  ditto analyze https://github.com/user/repo                              │
│  ditto analyze ./repo --package apps/web                                 │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  CLI (citty)                                                            │
│  ┌──────────────────────────────────────────────────┐                   │
│  │ 1. 인자 파싱 (source, --package, --model, --stack) │                   │
│  │ 2. 설정 로드 (c12: ditto.config.ts + 환경변수 머지)    │                   │
│  │ 3. DittoConfig 구성                                  │                   │
│  └──────────────────────────┬───────────────────────┘                   │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │ DittoConfig
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Pipeline Orchestrator                                                   │
│  PipelineContext 초기화 → Phase 순차 실행 → 결과 집계                         │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────────────────────────┐
          │                │                                    │
          ▼                │                                    │
┌─────────────────┐        │                                    │
│ Phase 1:        │        │                                    │
│ Extraction      │        │                                    │
│                 │        │                                    │
│ Input:          │        │                                    │
│  DittoConfig      │        │                                    │
│  (source URI)   │        │                                    │
│                 │        │                                    │
│ 처리:            │        │                                    │
│  repo-resolver  │        │                                    │
│  ├─ GitHub URL  │        │                                    │
│  │  → giget     │        │                                    │
│  │    다운로드    │        │                                    │
│  └─ 로컬 경로    │        │                                    │
│     → 검증      │        │                                    │
│  file-scanner   │        │                                    │
│  → tinyglobby   │        │                                    │
│  code-extractor │        │                                    │
│  config-extractor│       │                                    │
│  asset-extractor │       │                                    │
│                 │        │                                    │
│ Output:         │        │                                    │
│  ExtractedData  │        │                                    │
└────────┬────────┘        │                                    │
         │                 │                                    │
         │  ┌──────────────┘                                    │
         ▼  ▼                                                   │
┌─────────────────────┐                                         │
│ Health Check        │                                         │
│                     │                                         │
│ ExtractedData →     │                                         │
│ pass / warn / fail  │                                         │
│                     │                                         │
│ fail → 분석 중단     │                                         │
│        UserError    │                                         │
└────────┬────────────┘                                         │
         │ pass / warn                                          │
         ▼                                                      │
┌─────────────────┐                                             │
│ Phase 2:        │                                             │
│ Analysis        │                                             │
│                 │                                             │
│ Input:          │                                             │
│  ExtractedData  │                                             │
│                 │                                             │
│ 처리:            │                                             │
│  tech-stack     │                                             │
│  -detector      │                                             │
│       │         │                                             │
│       ▼         │                                             │
│  7개 Analyzer   │                                             │
│  (각각 LLM 호출) │                                             │
│  ├─ token       │                                             │
│  ├─ typography  │                                             │
│  ├─ component   │                                             │
│  ├─ layout      │                                             │
│  ├─ page        │                                             │
│  ├─ responsive  │                                             │
│  └─ interaction │                                             │
│       │         │                                             │
│       ▼         │                                             │
│  essence-       │                                             │
│  synthesizer    │                                             │
│  (종합 LLM 호출) │                                             │
│                 │                                             │
│ Output:         │                                             │
│  AnalysisResult │                                             │
│  → analysis.json│                                             │
└────────┬────────┘                                             │
         │                                                      │
         ▼                                                      │
┌─────────────────┐                                             │
│ Phase 3:        │                                             │
│ Documentation   │                                             │
│                 │                                             │
│ Input:          │                                             │
│  AnalysisResult │                                             │
│                 │                                             │
│ 처리:            │                                             │
│  doc-planner    │                                             │
│  → DocumentPlan │                                             │
│  (포함/제외 결정)  │                                             │
│       │         │                                             │
│       ▼         │                                             │
│  generators/    │                                             │
│  (각 문서별      │                                             │
│   LLM 호출)     │                                             │
│       │         │                                             │
│       ▼         │                                             │
│  writer         │                                             │
│  → design-spec/ │                                             │
│                 │                                             │
│ Output:         │                                             │
│  Generated-     │                                             │
│  Documents      │                                             │
└────────┬────────┘                                             │
         │                                                      │
         ▼                                                      │
┌─────────────────┐                                             │
│ Phase 4:        │                                             │
│ Prompt Gen      │                                             │
│                 │                                             │
│ Input:          │                                             │
│  AnalysisResult │◄───────────────────────────────────────────┘
│  Generated-     │  (AnalysisResult는 Phase 2에서 직접 전달)
│  Documents      │
│                 │
│ 처리:            │
│  step-planner   │
│  → StepPlan     │
│  (단계 수 결정)   │
│       │         │
│       ▼         │
│  context-       │
│  injector       │
│  (디자인 정보    │
│   선별 삽입)     │
│       │         │
│       ▼         │
│  generators/    │
│  (단계별 Prompt  │
│   LLM 생성)     │
│       │         │
│       ▼         │
│  writer         │
│  → prompts/     │
│                 │
│ Output:         │
│  Generated-     │
│  Prompts        │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  최종 산출물                                                              │
│                                                                          │
│  ditto-output/<project-name>/                                             │
│  ├── design-spec/                                                       │
│  │   ├── 00-overview.md                                                 │
│  │   ├── 01-design-tokens.md                                            │
│  │   ├── 02-typography.md                                               │
│  │   ├── 03-component-catalog.md                                        │
│  │   ├── 04-layout-system.md                                            │
│  │   ├── 05-page-structures.md                                          │
│  │   ├── 06-responsive-strategy.md    (조건부)                           │
│  │   ├── 07-interactions.md           (조건부)                           │
│  │   └── {nn}-{dynamic}.md            (동적 추가)                        │
│  ├── prompts/                                                           │
│  │   ├── README.md                                                      │
│  │   ├── step-01-project-setup.md                                       │
│  │   ├── step-02-design-system.md                                       │
│  │   ├── ...                          (4~12단계, 가변)                   │
│  │   └── step-{N}-{last-step}.md                                        │
│  └── analysis.json                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Phase 간 인터페이스

각 Phase는 명확한 입력/출력 타입으로 소통한다. 모든 타입은 `src/types/`에 정의된다.

### 4.1 Phase 1: Extraction

| 항목 | 타입 | 설명 |
|------|------|------|
| **입력** | `DittoConfig` | CLI 인자 + 설정 파일 머지 결과 (source, package, model 등) |
| **출력** | `ExtractedData` | 레포에서 추출한 모든 원시 데이터 |

```typescript
// types/extraction.ts

interface ExtractedData {
  meta: RepoMeta               // 레포 기본 정보 (이름, 경로, URL)
  files: FileTree               // 전체 파일 트리 구조
  packageJson: PackageJsonData  // package.json 파싱 결과
  configs: ConfigFiles          // tailwind.config, tsconfig 등 설정 파일 내용
  components: ComponentFile[]   // 컴포넌트 소스 코드 (경로 + 내용)
  styles: StyleFile[]           // 스타일 파일 (CSS, SCSS, Tailwind 등)
  assets: AssetMeta[]           // 에셋 메타데이터 (폰트, 아이콘 등)
  pages: PageFile[]             // 페이지/라우트 파일
}
```

### 4.2 Phase 1 → Health Check

| 항목 | 타입 | 설명 |
|------|------|------|
| **입력** | `ExtractedData` | Phase 1 출력 |
| **출력** | `HealthCheckResult` | 분석 가능성 판정 (pass/warn/fail + 사유) |

```typescript
// types/pipeline.ts

interface HealthCheckResult {
  status: 'pass' | 'warn' | 'fail'
  checks: HealthCheckItem[]     // 개별 체크 항목 결과
  warnings: string[]            // warn 사유 목록
  failReason?: string           // fail 시 사유
}
```

### 4.3 Phase 2: Analysis

| 항목 | 타입 | 설명 |
|------|------|------|
| **입력** | `ExtractedData` | Phase 1 출력 |
| **출력** | `AnalysisResult` | 구조화된 분석 결과 전체 (analysis.json으로 직렬화) |

```typescript
// types/analysis.ts

interface AnalysisResult {
  techStack: TechStackInfo        // 감지된 기술 스택
  tokens: DesignTokens            // 디자인 토큰 체계 (Color, Spacing, Shadow 등)
  typography: TypographySystem    // 타이포그래피 시스템
  components: ComponentCatalog    // 컴포넌트 분석 결과
  layout: LayoutSystem            // 레이아웃 시스템
  pages: PageStructure[]          // 페이지별 구성
  responsive: ResponsiveStrategy | null  // 반응형 전략 (없으면 null)
  interactions: InteractionPatterns      // 인터랙션 & 애니메이션
  essence: DesignEssence          // 디자인 에센스 종합
  metadata: AnalysisMetadata      // 분석 메타 (일시, 모델, confidence 등)
}
```

### 4.4 Phase 3: Documentation

| 항목 | 타입 | 설명 |
|------|------|------|
| **입력** | `AnalysisResult` | Phase 2 출력 |
| **출력** | `GeneratedDocuments` | 생성된 문서 목록 및 내용 |

```typescript
// types/documentation.ts

interface GeneratedDocuments {
  plan: DocumentPlan              // 문서 구성 계획 (포함/제외 목록)
  documents: DocumentEntry[]      // 생성된 각 문서 (파일명 + 마크다운 내용)
  outputDir: string               // 출력 디렉토리 경로
}

interface DocumentPlan {
  included: DocumentSpec[]        // 생성할 문서 목록 (번호, 이름, 사유)
  excluded: DocumentSpec[]        // 제외할 문서 목록 (사유 포함)
  dynamic: DocumentSpec[]         // 동적 추가 문서 목록
}
```

### 4.5 Phase 4: Prompt Generation

| 항목 | 타입 | 설명 |
|------|------|------|
| **입력** | `AnalysisResult` + `GeneratedDocuments` | Phase 2, 3 출력 |
| **출력** | `GeneratedPrompts` | 단계별 Prompt 세트 |

```typescript
// types/prompts.ts

interface GeneratedPrompts {
  plan: StepPlan                  // 단계 구성 계획
  steps: PromptStep[]             // 각 단계별 Prompt (번호, 제목, 마크다운 내용)
  readme: string                  // prompts/README.md 내용
  outputDir: string               // 출력 디렉토리 경로
}

interface StepPlan {
  totalSteps: number              // 총 단계 수
  steps: StepSpec[]               // 각 단계 사양 (번호, 제목, 의존성, 범위)
  splitReason?: string            // 분할 이유 (분할이 발생한 경우)
}

interface PromptStep {
  number: number
  slug: string                    // 파일명용 (예: "project-setup")
  title: string
  content: string                 // 마크다운 전체 내용
  dependencies: number[]          // 선행 단계 번호 목록
}
```

### 4.6 Pipeline Context

오케스트레이터가 Phase 간 데이터를 전달하는 공유 컨텍스트:

```typescript
// types/pipeline.ts

interface PipelineContext {
  config: DittoConfig
  extraction?: ExtractedData
  healthCheck?: HealthCheckResult
  analysis?: AnalysisResult
  documents?: GeneratedDocuments
  prompts?: GeneratedPrompts
  timing: PhaseTiming[]           // 각 Phase 소요 시간
}
```

---

## 5. 에러 처리 전략

### 5.1 에러 분류

3가지 에러 클래스를 정의하여 원인별로 다른 처리 전략을 적용한다.

```typescript
// types/errors.ts

/** 사용자 입력/환경 문제 — 사용자가 해결 가능 */
class UserError extends Error {
  constructor(
    message: string,
    public readonly hint?: string,      // 해결 방법 안내
    public readonly exitCode: number = 1
  ) {
    super(message)
    this.name = 'UserError'
  }
}

/** 시스템/인프라 문제 — 재시도 또는 버그 리포트 필요 */
class SystemError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,      // 원인 에러 체이닝
    public readonly exitCode: number = 2
  ) {
    super(message)
    this.name = 'SystemError'
  }
}

/** LLM API 관련 문제 — 재시도, 모델 변경, 또는 API 키 확인 */
class LLMError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number, // HTTP 상태 코드
    public readonly retryable: boolean = false,
    public readonly exitCode: number = 3
  ) {
    super(message)
    this.name = 'LLMError'
  }
}
```

### 5.2 에러 발생 지점별 분류

| 에러 클래스 | 발생 지점 | 예시 |
|------------|----------|------|
| `UserError` | CLI 인자 파싱 | 잘못된 source 경로, 존재하지 않는 디렉토리 |
| `UserError` | 설정 로드 | API 키 미설정, 잘못된 설정값 |
| `UserError` | Health Check | FE 프로젝트가 아님, 스타일 코드 없음 |
| `UserError` | Repo Resolver | GitHub URL 접근 불가, private 레포 |
| `SystemError` | 파일 I/O | 디스크 공간 부족, 권한 문제 |
| `SystemError` | giget 다운로드 | 네트워크 오류, 타임아웃 |
| `SystemError` | 내부 로직 | 예상치 못한 상태, 타입 불일치 |
| `LLMError` | API 호출 | 401 (키 오류), 429 (rate limit), 500 (서버 오류) |
| `LLMError` | Structured Output | Zod 스키마 검증 실패 (LLM 응답이 스키마에 맞지 않음) |
| `LLMError` | 컨텍스트 초과 | 입력 토큰 한도 초과 |

### 5.3 에러 전파 전략

```
Phase 내부 에러 발생
        │
        ▼
  재시도 가능? ──── Yes ──► 재시도 (LLMError.retryable, 최대 3회)
        │                         │
       No                     성공? ── Yes ──► 계속 진행
        │                         │
        │                        No
        ▼                         ▼
  Phase에서 throw ◄───────────────┘
        │
        ▼
  Orchestrator에서 catch
        │
        ▼
  에러 종류 판별
  ├── UserError  ──► consola.error() + hint 표시 → process.exit(1)
  ├── SystemError ──► consola.error() + 상세 원인 → process.exit(2)
  ├── LLMError   ──► consola.error() + 대응 안내 → process.exit(3)
  └── Unknown    ──► SystemError로 래핑 → process.exit(2)
```

### 5.4 사용자 친화적 에러 표시 (consola)

각 에러 클래스별로 consola를 활용한 표시 전략:

```typescript
// UserError 표시 예시
// consola.error('분석 대상이 FE 프로젝트가 아닙니다.')
// consola.info('힌트: package.json에 React, Vue 등 FE 프레임워크 의존성이 필요합니다.')

// LLMError 표시 예시 (rate limit)
// consola.error('LLM API 호출 한도를 초과했습니다. (429 Too Many Requests)')
// consola.info('잠시 후 다시 시도하거나, --model 옵션으로 다른 모델을 사용해 보세요.')

// SystemError 표시 예시
// consola.error('파일 쓰기에 실패했습니다: /output/design-spec/01-design-tokens.md')
// consola.info('디스크 공간이 충분한지 확인해 주세요.')
// consola.debug('원인:', error.cause)  // --verbose 모드에서만 상세 출력
```

### 5.5 Partial Failure 처리

Phase 2의 개별 Analyzer가 실패해도 전체 파이프라인을 중단하지 않는다:

- 개별 Analyzer 실패 시 해당 분석 항목을 `null`로 설정하고 경고 로그 출력
- `AnalysisResult.metadata`에 실패한 Analyzer 목록 기록
- Phase 3에서 `null`인 분석 항목에 대응하는 문서는 생략
- 핵심 Analyzer(token, component)가 모두 실패하면 파이프라인 중단

---

## 6. 로깅 전략

### 6.1 consola 기반 로깅 체계

`src/utils/logger.ts`에서 consola 인스턴스를 생성하고 전체 애플리케이션에서 공유한다.

```typescript
// utils/logger.ts
import { createConsola } from 'consola'

export const logger = createConsola({
  level: 3,  // 기본: info 레벨
  // --verbose 플래그 시 level: 4 (debug)
  // --silent 플래그 시 level: 0 (silent)
})
```

### 6.2 로그 레벨 정의

| 레벨 | consola 메서드 | 용도 | 표시 조건 |
|------|---------------|------|----------|
| **fatal** | `logger.fatal()` | 복구 불가능한 치명적 에러 | 항상 표시 |
| **error** | `logger.error()` | 처리 실패 에러 | 항상 표시 |
| **warn** | `logger.warn()` | 경고 (Health Check warn, Analyzer partial failure 등) | 항상 표시 |
| **info** | `logger.info()` | 주요 진행 상태 (Phase 시작/완료, 산출물 경로 등) | 기본 표시 |
| **debug** | `logger.debug()` | 상세 내부 정보 (LLM 프롬프트, 파일 목록, 타이밍 등) | `--verbose` 시 표시 |

### 6.3 Phase별 로깅 패턴

```
$ ditto analyze https://github.com/user/awesome-landing

ℹ 설정 로드 완료 (모델: gpt-5.2)
ℹ Phase 1: Extraction 시작...
  ● 레포 다운로드 중... (github:user/awesome-landing)
  ✔ 레포 다운로드 완료 (1.2s)
  ● 파일 스캔 중...
  ✔ 142개 파일 감지 (컴포넌트: 38, 스타일: 24, 설정: 8)
ℹ Phase 1: Extraction 완료 (3.4s)

ℹ Health Check: pass
  ✔ FE 프로젝트 확인 (Next.js)
  ✔ 스타일링 파일 확인 (Tailwind CSS)
  ✔ 컴포넌트 파일 확인 (38개 TSX)

ℹ Phase 2: Analysis 시작...
  ● 기술 스택 감지 중...
  ✔ Next.js 14 + Tailwind CSS + Framer Motion
  ● 디자인 토큰 분석 중...
  ✔ 토큰 분석 완료 (confidence: high)
  ● 컴포넌트 분석 중...
  ✔ 컴포넌트 분석 완료 — 28개 컴포넌트 (confidence: high)
  ...
  ● 디자인 에센스 종합 중...
  ✔ 에센스: "미니멀하고 세련된 SaaS 랜딩 — 넓은 여백, 부드러운 곡선, 절제된 모션"
ℹ Phase 2: Analysis 완료 (45.2s)

ℹ Phase 3: Documentation 시작...
  ● 문서 구성 계획 중...
  ✔ 7개 문서 생성 예정 (06-responsive-strategy.md 포함)
  ● 문서 생성 중...
  ✔ design-spec/ 생성 완료 (7개 문서)
ℹ Phase 3: Documentation 완료 (22.1s)

ℹ Phase 4: Prompt Generation 시작...
  ● 단계 계획 중...
  ✔ 8단계 Prompt 세트 구성
  ● Prompt 생성 중...
  ✔ prompts/ 생성 완료 (8개 Prompt + README)
ℹ Phase 4: Prompt Generation 완료 (18.7s)

✔ 분석 완료! (총 89.4s)
  📂 산출물: ./ditto-output/awesome-landing/
  ├── design-spec/  (7개 문서)
  ├── prompts/      (8단계 + README)
  └── analysis.json
```

### 6.4 디버그 모드 (`--verbose`)

`--verbose` 플래그 활성화 시 추가로 출력되는 정보:

| 항목 | 예시 |
|------|------|
| LLM 요청/응답 | 프롬프트 전문, 토큰 사용량, 응답 시간 |
| 파일 상세 | 스캔된 파일 전체 목록, 필터링 기준 |
| 설정 상세 | 최종 머지된 설정 전체 |
| Analyzer 상세 | 각 Analyzer의 입출력 요약, confidence 산출 근거 |
| 타이밍 상세 | 각 하위 작업별 소요 시간 |

### 6.5 진행 상태 표시

`src/utils/progress.ts`에서 consola의 스피너를 래핑하여 일관된 진행 표시 제공:

- **Phase 레벨**: `ℹ Phase N: {name} 시작/완료 (소요시간)` — `logger.info()`
- **Task 레벨**: `● {작업 설명}...` → `✔ {완료 요약}` — consola 스피너
- **경고**: `⚠ {경고 내용}` — `logger.warn()`
- **에러**: `✖ {에러 내용}` — `logger.error()`
