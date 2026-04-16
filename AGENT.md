# Ditto — Agent Guide

Ditto analyzes frontend repositories to extract design essence and generate AI coding agent prompts.

## Output Philosophy

Ditto extracts **design essence for mass production**, NOT 1:1 source replication.

- **Design tokens, typography, layout** are extracted as reusable specifications
- **Components** are analyzed and documented as a **pattern reference** only — no component implementation prompts are generated
- **Pages** are NOT replicated from the source. Instead, **showcase pages** are generated to demonstrate the extracted design system in action (Home+About for marketing, Dashboard+Settings for dashboard apps)
- Implementation prompts are **environment-aware** — they adapt to the detected stack, or remain stack-agnostic when no environment is detected

## Commands

```bash
ditto init                                                  # 대화형 초기 설정 (provider + API key)
ditto analyze <source>                                      # 분석 + 생성 한번에
ditto analyze <source> --analyze-only                       # 분석만 (analysis.json 생성)
ditto analyze <source> --dry-run                            # 추출만 (LLM 호출 없이 구조 확인)
ditto analyze <source> --include packages/ui,packages/tokens # 추가 경로 포함
ditto generate --from analysis.json --target next-tailwind  # 기존 분석으로 다른 환경 생성
ditto generate --from analysis.json --dry-run               # 생성 미리보기 (파일 쓰기 없음)
```

## Pipeline Architecture

```
입력: 소스 디렉토리 또는 GitHub URL

━━━ runAnalysisPipeline ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1: Lightweight Scan (LLM 0회)
  파일 스캔 (파일 읽기 없음) → file tree + project meta
  모노레포 감지 (findMonorepoRoot → 2-level tree)
  → .tmp/file-tree.md + .tmp/project-meta.md

Early Validation (LLM 0회)
  API key, model/provider 호환성 검증 → 실패 시 즉시 UserError

Phase 2 - Pass 1: LLM Planning (LLM 1회)
  file-tree.md + project-meta.md → structured JSON (Zod schema)
  → AnalysisPlan: aspects, waves, fileSelection

Phase 2 - Pass 1.5: Lazy File Loading (LLM 0회)
  planner가 선택한 파일만 디스크에서 읽기 → CodeChunk[]
  resolveFiles → <50% match시 FileSelectionError (fast-fail)

Phase 2 - Pass 2: Wave Execution (LLM N회)
  Wave 1: designTokens
  Wave 2: typography + layoutSystem (병렬)
  Wave 3: 나머지 aspects (병렬, concurrency=3)
  선행 wave 결과를 cross-aspect context로 후행에 주입
  진행률 바: [█████░░░░░] [3/6] ETA: ~2m 30s
  → .tmp/result-{aspect}.json

Phase 2 - Pass 3: Synthesis (LLM 1회)
  viability 평가 → reconciliation → essence 합성
  → analysis.json + analysis.md
  상세 리포트: Aspect별 성공/실패, 토큰 사용량 분석, 출력 파일 목록

Cleanup: .tmp/ 삭제 (--debug 시 보존)
  실패 시 workspace 보존 + 안내 메시지 출력

━━━ runGeneratePipeline ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 3: 디자인 스펙 문서 생성 (LLM 0회, 템플릿)
Phase 4: 구현 프롬프트 생성 (LLM 0회, 템플릿)
```

### Key Design Decisions

- **No pre-reading**: Phase 1은 파일 시스템 스캔만 — 파일 내용 읽기 없음
- **LLM-driven file selection**: LLM이 file-tree.md + project-meta.md를 보고 structured JSON으로 aspect별 핵심 파일 선정
- **Lazy file loading**: planner가 선택한 파일만 디스크에서 읽기 (200개 사전 로딩 없음)
- **File selection validation**: LLM 선택 파일의 50% 이상이 실제 존재해야 함, 아니면 FileSelectionError (fast-fail)
- **Wave-based execution**: designTokens → typography+layout → 나머지 순서로 실행, 선행 결과를 후행에 제공
- **Monorepo support**: findMonorepoRoot로 자동 감지, 2-level file tree 생성
- **tmp workspace**: 중간 산출물을 .tmp/에 저장하여 디버깅/재시도 지원
- **Workspace preservation on failure**: 실패 시 .tmp/ 유지 + 경로 안내
- **2-command separation**: `ditto analyze` (LLM 비용 발생) + `ditto generate` (무료, 반복 가능)
- **Dual output**: analysis.json (내부용, generate 파이프라인 입력) + analysis.md (사용자용 요약)

## Output Structure

### Generated Documents (Phase 3)

| File | Aspect | Category |
|------|--------|----------|
| `01-design-tokens.md` | tokens | core |
| `02-typography.md` | typography | core |
| `03-component-catalog.md` | components | core |
| `04-layout-system.md` | layout | core |
| `05-page-structures.md` | pages | dynamic |
| `06-responsive-strategy.md` | responsive | dynamic |
| `07-interactions.md` | interactions | dynamic |

### Generated Prompts (Phase 4)

| Step | Source |
|------|--------|
| `setup` | infra (항상 포함) |
| `design-tokens` | tokens aspect |
| `typography` | typography aspect |
| `layout-shell` | layout aspect (조건부) |
| `showcase-pages` | pages aspect |
| `responsive` | responsive aspect (조건부) |
| `interactions` | interactions aspect (조건부) |

Steps form a dependency DAG: `setup → design-tokens → typography → layout-shell → showcase-pages → responsive/interactions`

## CLI Subcommands

| Command | Description |
|---------|-------------|
| `ditto analyze <source>` | Analyze + generate (LLM calls) |
| `ditto generate --from` | Generate from existing analysis (free) |
| `ditto config show/set/path` | Manage global config |
| `ditto init` | Interactive setup: select provider, enter API key, save to settings.json |

## Tech Stack

- **Runtime**: Node.js ≥ 20, TypeScript 5.7+, ESM-only
- **AI**: AI SDK v6 (`generateText` + `Output.object()` / `Output.json()`)
- **Schema**: Zod 3.24+
- **CLI**: citty, consola, c12
- **Build**: tsdown (ESM, dts)
- **Test**: vitest (`src/**/__tests__/**/*.test.ts`)
- **Lint/Format**: Biome — tabs, no semicolons, double quotes, 100 line width
- **Package Manager**: pnpm

## Path Aliases

| Alias | Directory | Layer |
|-------|-----------|-------|
| `@infra/*` | `src/infra/*` | Layer 0 (I/O) |
| `@domain/*` | `src/domain/*` | Layer 1 (비즈니스 로직) |
| `@app/*` | `src/app/*` | Layer 2 (오케스트레이션) |
| `@defs/*` | `src/domain/types/*` | Layer 1 (타입) |

의존 방향: `infra ← domain ← app` (단방향 강제)

> `@defs` (not `@types`) is used to avoid conflicts with DefinitelyTyped's `@types` scope.

## Architecture — 3-Layer + Vertical Slice

### Layer Structure

의존 방향: `infra ← domain ← app` (단방향)

- **`src/infra/`** (Layer 0): 외부 서비스, I/O — LLM client, file scanner, config loader, output writers
- **`src/domain/`** (Layer 1): 순수 비즈니스 로직 — types, constants, aspects, rendering, analysis, llm-prompts
- **`src/app/`** (Layer 2): 오케스트레이션 — pipeline, CLI, runner

### Vertical Slice (Aspects)

Each design aspect is a self-contained vertical slice under `src/domain/aspects/<name>/`:

- `schema.ts` — Zod schemas for analysis output
- `descriptor.ts` — `AspectDescriptor<K>` with analyzer config, doc/prompt templates, planning
- `doc-template.ts` — Document rendering function
- `prompt-template.ts` — Prompt rendering function (aspects with implementation steps)
- `chunking.ts` — Chunked analysis config (components aspect only)

### Key Types

- **`AspectTypeMap`** (`@defs/aspect-map.ts`): Maps aspect names to analysis types
- **`AspectDescriptor<K>`** (`@defs/descriptor.ts`): Generic descriptor with `analyzer` and `planning` sections
- **`ASPECT_REGISTRY`** (`@domain/aspects/registry.ts`): Typed registry keyed by `AspectName`
- **`ILLMClient`** (`@infra/llm/client.ts`): Interface for DI-friendly LLM access
- **`PipelineContext`** (`@defs/pipeline.ts`): DI container with `llmClient`, `usage`

## Source Layout

```
src/
├── index.ts
├── infra/                          # Layer 0: I/O
│   ├── fs.ts, logger.ts, progress.ts  # 진행률 바 (ETA, aspect tracker)
│   ├── llm/                        # client, errors, presets, retry, usage
│   ├── source/                     # file-scanner, repo-resolver, workspace-detector, tech-stack-detector
│   ├── output/                     # docs.ts, prompts.ts
│   └── config/                     # loader, schema, defaults, provider-env
├── domain/                         # Layer 1: 비즈니스 로직
│   ├── types/                      # 모든 타입 (@defs/*)
│   ├── constants/                  # analysis, extraction, token-estimation, target-presets
│   ├── aspects/                    # 7 vertical slices
│   ├── rendering/                  # format-utils, tree-renderer, resolve-environment, step-contracts, renderers/
│   ├── analysis/                   # context-builder, plan-parser, viability, reconciliation, file-resolver
│   ├── llm-prompts/               # shared-principles, prompt-builder, analyzer-configs
│   └── path-utils.ts
└── app/                            # Layer 2: 오케스트레이션
    ├── runner.ts                   # LLM analyzer runner (chunked + single)
    ├── pipeline/                   # orchestrator, planner, wave-executor, workspace, validation 등
    │   └── planners/
    └── cli/                        # commands (analyze, generate, config, init)
```

## Common Commands

```bash
pnpm dev <source>        # Run CLI in dev mode
pnpm build               # Build with tsdown
pnpm test:run            # Run all tests once
pnpm typecheck           # tsc --noEmit
pnpm lint                # Biome check
pnpm lint:fix            # Biome auto-fix
```

## Coding Conventions

- Use path aliases for all imports (never relative paths crossing module boundaries)
- All imports must use `.js` extension suffix (ESM resolution)
- Biome handles import sorting — run `pnpm lint:fix` after adding imports
- Prefer `as const` for constant objects
- Use `type` imports for type-only references
- Tests live in `__tests__/` directories co-located with source
- Korean is preferred for user-facing docs (README, ARCHITECTURE); code comments in English
