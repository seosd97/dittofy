# Ditto 정밀 리뷰 브리핑

## 프로젝트 개요

Ditto는 FE 레포지토리를 분석하여 디자인 에센스를 추출하고, AI 코딩 에이전트용 구현 프롬프트를 생성하는 CLI 도구.

- **스택**: TypeScript, Node.js >=20, ESM, pnpm
- **AI SDK**: Vercel AI SDK v6 (`ai ^6.0.0`)
- **Provider**: OpenAI, Anthropic, Zhipu (GLM-5)
- **코드**: ~5,000줄 (src/), 55 tests (8 files)
- **상태**: M0~M2 기능 구현 완료, M3 (안정화/배포) 미착수

## 아키텍처 — 4-Phase 파이프라인

```
Phase 1 (Extraction)     → Phase 2 (Analysis)       → Phase 3 (Documentation) → Phase 4 (Prompt Gen)
No LLM                     7 analyzers (concurrent)    8 doc generators           6+ prompt generators
file scan, code extract    + essence synthesizer       sequential                 sequential
tech stack detect          concurrency limit: 3
```

## 리뷰 대상 파일 및 영역

### 1. LLM 호출 레이어 (`src/llm/`)

| 파일 | 줄수 | 핵심 기능 | 리뷰 포인트 |
|------|------|-----------|-------------|
| `client.ts` | 175 | callLLM, 2-strategy (structured/json_object), tryExtractJSON | fallback 체인 안정성, 에러 처리 경로, silent catch |
| `presets.ts` | 60 | TASK_PRESETS (10), PROVIDER_PROFILES (3), resolveCallConfig | multiplier 값 적정성, 확장성 |
| `provider.ts` | 46 | createModel (3 providers) | OpenAI Responses API vs Chat Completions |
| `retry.ts` | 93 | withRetry, isRetryable, exponential backoff | retry 범위, non-retryable 누락 가능성 |
| `usage.ts` | 30 | UsageTracker | reasoning 토큰 미추적 |
| `context-builder.ts` | 100 | 토큰 예산 기반 파일 선별 | 토큰 추정 정확도 (1토큰≈4char) |

**Known Issues**:
- `callWithStructuredOutput`의 catch가 모든 에러를 잡아 fallback → 인증/네트워크 에러도 불필요한 2차 호출 발생
- `tryExtractJSON`이 trailing text 있는 JSON 파싱 불가 (앞쪽 `{`만 찾고 뒤는 안 잘라냄)
- GLM-5 reasoning 토큰이 UsageTracker에 미반영
- 토큰 추정이 1:4 비율 고정 — CJK/특수문자 프로젝트에서 부정확

### 2. Phase 1: Extraction (`src/phases/extraction/`)

| 파일 | 줄수 | 핵심 기능 | 리뷰 포인트 |
|------|------|-----------|-------------|
| `file-scanner.ts` | 90 | 파일 스캔, gitignore 처리, 카테고리 분류 | 대형 레포 성능, symlink 처리 |
| `code-extractor.ts` | 120 | 코드 추출, 파일 크기 제한 | 바이너리 파일 필터링, 인코딩 이슈 |
| `repo-resolver.ts` | 150 | GitHub URL/로컬 경로 해석, monorepo 감지 | temp dir 정리, 에러 경로 |
| `tech-stack-detector.ts` | 140 | package.json 기반 기술 스택 감지 | 감지 누락 (Bun, Deno 등) |

### 3. Phase 2: Analysis (`src/phases/analysis/`)

| 파일 | 줄수 | 핵심 기능 | 리뷰 포인트 |
|------|------|-----------|-------------|
| `index.ts` | 267 | 7 analyzer 병렬 실행, concurrency limiter, fallback | empty 결과 품질, partial failure 처리 |
| `analyzers/*.ts` | 각 ~40줄 | 7개 분석기 (동일 패턴) | 프롬프트 품질, 스키마 적정성 |
| `essence-synthesizer.ts` | 55 | 전체 분석 종합 | null 분석 결과 입력 시 품질 |

### 4. Phase 3: Documentation (`src/phases/documentation/`)

| 파일 | 줄수 | 핵심 기능 | 리뷰 포인트 |
|------|------|-----------|-------------|
| `index.ts` | 120 | 8 doc generator 순차 실행 | 에러 시 partial 문서 처리 |
| `doc-planner.ts` | 55 | 문서 계획 (core/conditional 구분) | 조건부 문서 스킵 로직 |
| `generators/*.ts` | 각 ~60줄 | 8개 문서 생성기 | LLM 프롬프트 품질 |

### 5. Phase 4: Prompt Generation (`src/phases/prompt-gen/`)

| 파일 | 줄수 | 핵심 기능 | 리뷰 포인트 |
|------|------|-----------|-------------|
| `index.ts` | 95 | step 루프, stepType 기반 라우팅 | 에러 시 partial prompt 처리 |
| `step-planner.ts` | 95 | 구현 단계 계획, 의존성 | 단계 수 적정성, 의존성 로직 |
| `context-injector.ts` | 230 | 각 step에 맞는 컨텍스트 주입 | scope 매칭 정확도 |

### 6. Pipeline/Config/CLI

| 파일 | 줄수 | 핵심 기능 | 리뷰 포인트 |
|------|------|-----------|-------------|
| `pipeline/orchestrator.ts` | 177 | 4-phase 순차 실행, 에러 수집 | phase 간 데이터 흐름, 에러 전파 |
| `config/loader.ts` | 28 | c12 기반 설정 로드, env 해석 | dotenv 미지원 (.env 자동 로드 안 됨) |
| `cli/commands/analyze.ts` | 73 | CLI 진입점 | debug 플래그 미연결 |

## 이전에 발견된 이슈 유형 (재발 주의)

1. **AI SDK v6 파라미터 변경**: `maxTokens` → `maxOutputTokens`, `generateObject` deprecated
2. **provider별 호환성**: GLM-5는 json_schema 미지원, Responses API 미지원
3. **토큰/비용 관련**: reasoning 토큰 오버헤드, 토큰 추정 부정확
4. **에러 경로 미처리**: silent catch, fallback에서 원본 에러 유실
5. **모듈 레벨 상태**: `_provider` 전역 변수 (테스트 격리 어려움)

## 리뷰 단계 제안

```
Step 1: LLM 레이어 (client, retry, presets, provider, usage, context-builder)
Step 2: Phase 1 — Extraction (file-scanner, code-extractor, repo-resolver, tech-stack-detector)
Step 3: Phase 2 — Analysis (orchestrator, 7 analyzers, essence-synthesizer, schemas, prompts)
Step 4: Phase 3+4 — Documentation & Prompt Gen (generators, planner, context-injector)
Step 5: Pipeline/Config/CLI (orchestrator, config, CLI commands)
Step 6: Architecture — 전체 구조, 데이터 흐름, 확장성, 성능
```

## 벤치마크 데이터 (참고)

| 대상 | Provider | 결과 | 토큰 | 시간 |
|------|----------|------|------|------|
| idp-web (React 19, Vanilla Extract, 63 TSX) | GLM-5 | 7/7 분석, 7/7 문서, 10 프롬프트 | 249,497 | 25.9분 |

## 파일 구조 요약

```
src/ (4,964 lines)
├── cli/           (146L) — CLI commands
├── config/         (59L) — Config loading
├── llm/         (1,015L) — LLM client, provider, presets, retry, schemas, prompts
├── phases/      (3,013L) — 4 phases (extraction, analysis, documentation, prompt-gen)
├── pipeline/      (240L) — Orchestrator, health check
├── types/         (409L) — Type definitions
└── utils/          (79L) — Logger, fs, path
```
