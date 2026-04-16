# Ditto — Architecture Overview

## What is Ditto?

Ditto는 프론트엔드 코드베이스를 분석하여 **디자인 에센스를 추출**하고, AI 코딩 에이전트가 해당 디자인을 구현할 수 있는 **프롬프트를 생성**하는 CLI 도구다.

1:1 복제가 아닌, 디자인 시스템의 본질(design tokens, 타이포그래피, 레이아웃, 컴포넌트 패턴 등)을 추출하여 새로운 환경에서 재현 가능한 형태로 제공한다.

```
소스 코드베이스  →  Ditto  →  analysis.json + design-spec 문서 + 구현 프롬프트
```

---

## 1. 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  app (Layer 2) — 오케스트레이션                         │
│  Pipeline 조율, CLI 엔트리포인트, 실행 러너             │
├─────────────────────────────────────────────────────────┤
│  domain (Layer 1) — 비즈니스 로직                       │
│  타입, 상수, Aspect 시스템, 분석 로직, 렌더링           │
├─────────────────────────────────────────────────────────┤
│  infra (Layer 0) — I/O                                 │
│  LLM API, 파일 시스템, 설정 로딩, 출력                  │
└─────────────────────────────────────────────────────────┘
        의존 방향: infra ← domain ← app (단방향 강제)
```

| Layer | 역할 | 특징 |
|-------|------|------|
| **infra** (`@infra/*`) | 외부 세계와의 모든 통신 | LLM 호출, 파일 스캔, 설정 로드, 출력 |
| **domain** (`@domain/*`, `@defs/*`) | 순수 비즈니스 로직 | 외부 의존 없음, Zod만 사용 |
| **app** (`@app/*`) | 전체 파이프라인 조율 | 하위 두 계층을 조립하여 실행 |

**핵심 규칙**: 하위 계층은 상위 계층을 import할 수 없다. domain이 I/O가 필요할 때는 인터페이스를 정의하고 app에서 주입(DI)한다.

---

## 2. Aspect — Vertical Slice

디자인 분석의 핵심 단위. 프론트엔드 디자인 시스템을 7개의 수직 슬라이스로 나눈다.

```
src/domain/aspects/
├── tokens/         → 디자인 토큰 (색상, 간격, 둥근 모서리, 그림자)
├── typography/     → 타이포그래피 (폰트, 스케일, 웨이트, 줄높이)
├── components/     → 컴포넌트 카탈로그 (패턴, 변형, 상태)
├── layout/         → 레이아웃 시스템 (그리드, 컨테이너, 네비게이션)
├── pages/          → 페이지 구조 (섹션, 컴포넌트 배치)
├── responsive/     → 반응형 전략 (브레이크포인트, 적응 패턴)
└── interactions/   → 인터랙션 패턴 (애니메이션, 트랜지션)
```

각 Aspect는 자기완비적인 모듈이다:

```
aspects/<name>/
├── schema.ts          # Zod 스키마 (타입의 유일한 진실의 원천)
├── descriptor.ts      # AspectDescriptor<K> — defineAspect()로 등록
├── doc-template.ts    # 문서 렌더링 (analysis → Markdown)
├── prompt-template.ts # 구현 프롬프트 렌더링 (선택적)
└── chunking.ts        # 대규모 데이터 청킹 설정 (선택적)
```

모든 Aspect는 `ASPECT_REGISTRY`에 등록되며, 타입 안전성은 제네릭 `AspectDescriptor<K>`가 보장한다.

---

## 3. Pipeline — Data Flow

Ditto는 두 명령으로 분리된 파이프라인을 사용한다:

```
ditto analyze <source>          ← LLM 비용 발생
ditto generate --from analysis  ← 무료, 반복 가능
```

### analyze 파이프라인

```
소스 디렉토리 / GitHub URL
        │
        ▼
┌─────────────────────────────────────┐
│ Phase 1: Lightweight Scan (LLM 0회) │
│ 파일 시스템 스캔만 (내용 읽기 없음)   │
│ → file-tree.md, project-meta.md     │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ Phase 2-Pass 1: Planning (LLM 1회)   │
│ LLM이 file tree를 보고 분석 계획 수립  │
│ → 어떤 aspect를 분석할지, 어떤 파일을 │
│   읽을지, 웨이브 순서 결정             │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ Phase 2-Pass 1.5: Lazy File Loading │
│ planner가 선택한 파일만 실제로 읽기    │
│ 매칭율 <50% → 즉시 실패 (fast-fail)  │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ Phase 2-Pass 2: Wave Execution      │
│                                     │
│  Wave 1: designTokens (기반)        │
│     ↓                               │
│  Wave 2: typography + layout (병렬)  │
│     ↓                               │
│  Wave 3: 나머지 aspects (병렬)      │
│                                     │
│ 선행 wave 결과 → 후행 wave에 주입     │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ Phase 2-Pass 3: Synthesis (LLM 1회)  │
│ 모든 분석 결과 통합 → 일관성 검사      │
│ → analysis.json + analysis.md        │
└─────────────────────────────────────┘
```

### generate 파이프라인

```
analysis.json
     │
     ▼
┌──────────────────────────────────────┐
│ Phase 3: Design Spec 문서 (LLM 0회)  │
│ 템플릿 기반 → 7개 Markdown 문서       │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│ Phase 4: 구현 프롬프트 (LLM 0회)      │
│ 템플릿 기반 → step-by-step 가이드     │
│ setup → tokens → typography → pages  │
└──────────────────────────────────────┘
```

### 핵심 설계 결정

- **No pre-reading**: Phase 1에서는 파일 내용을 읽지 않는다 — 메타데이터만
- **LLM-driven file selection**: 사람이 "이 파일 분석해"라고 지정하는 것이 아니라 LLM이 file tree를 보고 스스로 판단
- **Lazy loading**: LLM이 선택한 파일만 디스크에서 읽기 (전체 파일 사전 로딩 없음)
- **Wave-based dependency**: designTokens가 먼저 분석되어야 typography, layout 등이 참조 가능
- **2-command 분리**: 비싼 LLM 호출(analyze)과 무료 템플릿 생성(generate)을 분리

---

## 4. Key Abstractions

### PipelineContext — DI 컨테이너

파이프라인 전체에서 공유되는 실행 컨텍스트. I/O 의존성을 인터페이스로 주입받아 domain 계층의 순수성을 유지한다.

```typescript
interface PipelineContext {
  config: DittoConfig       // 설정
  source: string            // 입력 소스
  resolvedPath: string      // 해결된 경로
  llmClient: ILLMClient    // LLM 클라이언트 (인터페이스)
  usage: UsageTracker       // 토큰 사용량 추적
  // ...
}
```

### ILLMClient — Provider 추상화

LLM 호출을 추상화하여 9개 이상의 provider를 지원한다:

```
OpenAI, Anthropic, Gemini, Groq, Mistral, DeepSeek, xAI, Z.AI, OpenRouter
```

모든 provider는 동일한 `ILLMClient` 인터페이스 뒤에 숨으며, AI SDK v6의 `generateText` + `Output.object()`를 사용한 구조화 출력(structured output)을 제공한다.

### AspectTypeMap — 타입 레지스트리

Aspect 이름과 분석 결과 타입을 매핑하는 제네릭 맵. `z.infer<typeof schema>`에서 파생된 타입을 사용하여 Zod 스키마가 유일한 진실의 원천(single source of truth)이 되도록 한다.

```
Zod Schema → z.infer → TypeScript type → AspectTypeMap → AnalysisResult
```

---

## 5. Configuration

설정은 4단계로 병합(merge)된다 (뒤쪽이 우선):

```
기본값 → ~/.ditto/config.json → ditto.config.json → CLI 인수 / 환경변수
```

`--debug`로 LLM I/O 로깅과 중간 산출물 보존, `--dry-run`으로 사전 검사, `--include`로 모노레포 추가 경로 등의 옵션을 지원한다.

---

## 6. Output

```
ditto-output/<project>/
├── analysis.json              # 기계가 읽는 분석 결과 (generate 입력)
├── analysis.md                # 사람이 읽는 분석 요약
├── design-spec/               # 7개 디자인 스펙 문서
│   ├── 01-design-tokens.md
│   ├── 02-typography.md
│   ├── 03-component-catalog.md
│   ├── 04-layout-system.md
│   ├── 05-page-structures.md
│   ├── 06-responsive-strategy.md
│   └── 07-interactions.md
└── prompts/                   # 단계별 구현 프롬프트
    ├── README.md
    ├── step-01-setup.md
    ├── step-02-design-tokens.md
    └── ...
```

---

## 7. Tech Stack

| 분야 | 기술 |
|------|------|
| Runtime | Node.js >= 22, ESM-only |
| Language | TypeScript 5.7+ |
| AI | AI SDK v6 (`generateText` + `Output`) |
| Schema | Zod 3.24+ |
| CLI | citty + consola |
| Config | c12 |
| Build | tsdown |
| Test | vitest |
| Lint | Biome (tab, no-semicolons, double quotes) |
| Package | pnpm |
