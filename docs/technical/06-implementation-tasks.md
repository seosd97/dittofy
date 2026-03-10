# 06. Implementation Tasks — 구현 작업 상세

마일스톤 기반 구현 작업 분해. 각 태스크는 의존 관계에 따라 순서가 지정되며, 완료 기준이 명확히 정의된다.

> **참조 문서**: [00-project-overview](../planning/00-project-overview.md), [05-roadmap](../planning/05-roadmap.md), [00-tech-decisions](./00-tech-decisions.md), [01-architecture](./01-architecture.md), [02-cli-design](./02-cli-design.md), [03-type-definitions](./03-type-definitions.md), [05-llm-integration](./05-llm-integration.md)

---

## M0: Foundation — 프로젝트 기반

프로젝트 초기화, 핵심 인프라, CLI 골격, LLM 클라이언트, 파이프라인 오케스트레이터(stub)를 구축한다.

---

### M0-01: 프로젝트 초기화 및 개발 환경 설정

**설명**: pnpm 프로젝트를 생성하고, TypeScript, Biome, Vitest, tsdown 등 개발 도구를 설정한다. ESM 기반 `package.json` 구성과 Node.js >= 20 엔진 제약을 포함한다.

**생성/수정 파일**:
- `package.json` — `"type": "module"`, `engines.node >= 20`, scripts(`dev`, `build`, `test`, `lint`, `format`)
- `tsconfig.json` — target: ES2022, module: ESNext, moduleResolution: bundler, strict: true
- `biome.json` — formatter(탭 들여쓰기, 세미콜론 없음), linter 추천 규칙 전체 활성화
- `tsdown.config.ts` — CJS+ESM 듀얼 빌드, bin shebang 포함
- `vitest.config.ts` — ESM 네이티브 설정
- `.gitignore`, `.npmignore`
- `src/index.ts` — 빈 진입점

**의존 태스크**: 없음

**완료 기준**:
- `pnpm install` 성공
- `pnpm run build`로 `dist/` 생성 (CJS + ESM)
- `pnpm run test` 실행 가능 (빈 테스트 스위트)
- `pnpm run lint` 및 `pnpm run format` 정상 동작
- `node --version` >= 20 검증 로직 포함

---

### M0-02: 공유 타입 정의 (types/)

**설명**: 파이프라인 전체에서 사용되는 핵심 TypeScript 인터페이스를 `src/types/`에 정의한다. `03-type-definitions.md`의 모든 타입을 코드로 옮긴다.

**생성/수정 파일**:
- `src/types/common.ts` — `ConfidenceLevel`, `Confident<T>`, `TechStack`, `StylingInfo`, `StylingTier`, `HealthCheckResult`, `HealthCheckItem`
- `src/types/pipeline.ts` — `PipelineConfig`, `TargetStack`, `PhaseSelection`, `PipelineContext`, `PhaseResult`, `PhaseName`, `PhaseMessage`
- `src/types/extraction.ts` — `ExtractionResult`, `ProjectMeta`, `FileTreeNode`, `CodeChunk`, `CodeFileType`, `ConfigFile`, `ConfigType`, `ExtractionStats`
- `src/types/analysis.ts` — `AnalysisResult`, `AnalysisMeta`, `DesignEssence`, `DesignTokens`, `ComponentCatalog`, `LayoutSystem`, `PageStructures`, `ResponsiveStrategy`, `InteractionPatterns` 및 모든 하위 인터페이스
- `src/types/documentation.ts` — `DocumentSet`, `DocumentEntry`, `DocumentType`, `CoreDocumentId`
- `src/types/prompts.ts` — `PromptSet`, `ResolvedTargetStack`, `PromptStep`, `PromptStepId`
- `src/types/errors.ts` — `UserError`, `SystemError`, `LLMError` 클래스
- `src/types/config.ts` — `DittoConfig`, `AnalyzeOptions`, `ConfigOptions`
- `src/types/index.ts` — 모든 타입 re-export

**의존 태스크**: M0-01

**완료 기준**:
- 모든 타입이 `03-type-definitions.md` 문서와 1:1 대응
- `types/` 디렉토리는 다른 `src/` 모듈을 import하지 않음 (순수 타입)
- `pnpm run build` 시 타입 에러 없음
- 타입 간 순환 참조 없음

---

### M0-03: 에러 클래스 및 유틸리티 (utils/)

**설명**: 에러 클래스 구현과 공통 유틸리티(logger, fs 헬퍼, path 정규화, progress 표시)를 구현한다. `consola` 기반 로깅 체계를 설정한다.

**생성/수정 파일**:
- `src/types/errors.ts` — `UserError`, `SystemError`, `LLMError` 클래스 구현 (M0-02에서 정의한 인터페이스의 실제 구현)
- `src/utils/logger.ts` — `consola` 래퍼, 로그 레벨(fatal/error/warn/info/debug), `--verbose`/`--silent` 대응
- `src/utils/fs.ts` — 파일 읽기/쓰기 헬퍼, 디렉토리 생성, 존재 확인
- `src/utils/path.ts` — 경로 정규화, 출력 디렉토리 경로 결정 (`<output>/<project-name>/`)
- `src/utils/progress.ts` — consola 스피너 래퍼, Phase/Task 레벨 진행 표시
- `src/utils/index.ts` — re-export
- `tests/utils/logger.test.ts` — 로그 레벨 전환 테스트
- `tests/utils/path.test.ts` — 경로 정규화 테스트

**의존 태스크**: M0-01, M0-02

**완료 기준**:
- `UserError`, `SystemError`, `LLMError` 각각 올바른 속성과 종료 코드를 가짐
- `logger.info()`, `logger.debug()` 등 모든 레벨이 정상 동작
- `--verbose` 시 debug 레벨, `--silent` 시 silent 레벨 전환 확인
- 경로 유틸리티 단위 테스트 통과

---

### M0-04: 설정 시스템 (config/)

**설명**: `c12` 기반 설정 로드 시스템을 구현한다. 글로벌 설정(`~/.config/ditto/`), 프로젝트 설정(`ditto.config.ts`), 환경 변수(`DITTO_` 접두사), CLI 옵션의 5단계 우선순위 머지를 구현한다.

**생성/수정 파일**:
- `src/config/loader.ts` — `loadDittoConfig()` 함수, c12 설정 로드, 우선순위 머지
- `src/config/defaults.ts` — 기본 설정값 정의 (model: `gpt-5.2`, language: `ko`, stack: `auto`, output: `./ditto-output`)
- `src/config/schema.ts` — Zod 기반 설정 스키마 검증
- `src/config/api-keys.ts` — `resolveApiKey()` 함수, 환경변수 → 설정파일 → 대화형 프롬프트 순 탐색
- `src/config/define.ts` — `defineConfig()` 헬퍼 (사용자 설정 파일용 타입 힌트)
- `src/config/index.ts` — re-export
- `tests/config/loader.test.ts` — 우선순위 머지 테스트

**의존 태스크**: M0-01, M0-02, M0-03

**완료 기준**:
- 설정 파일 없이 기본값으로 DittoConfig 생성 가능
- 환경 변수 `DITTO_MODEL=claude-sonnet` 설정 시 model 필드에 반영
- CLI 옵션이 환경 변수/설정 파일보다 우선
- API 키 미설정 시 사용자 친화적 에러 메시지 출력
- `defineConfig()` 함수가 타입 추론 지원

---

### M0-05: CLI 메인 진입점 및 `ditto config` 명령어

**설명**: `citty` 기반 CLI 메인 진입점과 `ditto config` 서브커맨드(set/get/list/reset)를 구현한다. `bin` 필드로 `ditto` 명령어를 등록한다.

**생성/수정 파일**:
- `src/cli/index.ts` — 메인 CLI 정의, `runMain()`, `ditto --version`, `ditto --help`
- `src/cli/commands/config.ts` — `ditto config set/get/list/reset` 서브커맨드
- `package.json` — `bin.ditto` 필드 추가
- `tests/cli/config.test.ts` — config 서브커맨드 단위 테스트

**의존 태스크**: M0-04

**완료 기준**:
- `tsx src/cli/index.ts --version` 버전 출력
- `tsx src/cli/index.ts --help` 도움말 출력
- `tsx src/cli/index.ts config set model claude-sonnet` 글로벌 설정에 저장
- `tsx src/cli/index.ts config get model` 값 조회 (출처 표시 포함)
- `tsx src/cli/index.ts config list` 전체 설정 테이블 출력
- `tsx src/cli/index.ts config reset model` 특정 키 초기화

---

### M0-06: `ditto analyze` 명령어 (옵션 파싱/검증)

**설명**: `ditto analyze <source>` 명령어의 인자 파싱 및 유효성 검증을 구현한다. 실제 파이프라인 실행은 stub으로 둔다.

**생성/수정 파일**:
- `src/cli/commands/analyze.ts` — analyze 명령어 정의, 모든 옵션(`--output`, `--package`, `--stack`, `--model`, `--language`, `--docs-only`, `--prompts-only`) 파싱
- `src/cli/formatter.ts` — CLI 출력 포맷팅 (헤더 출력, 설정 요약 표시)
- `tests/cli/analyze.test.ts` — 옵션 파싱/검증 테스트

**의존 태스크**: M0-04, M0-05

**완료 기준**:
- `ditto analyze ./repo` 실행 시 설정 로드 → 유효성 검증 → 헤더 출력까지 동작
- `--docs-only`와 `--prompts-only` 동시 사용 시 에러
- 지원하지 않는 `--stack`, `--model`, `--language` 값에 대해 명확한 에러 메시지
- 모든 옵션의 기본값이 `02-cli-design.md`와 일치

---

### M0-07: LLM 클라이언트 추상화 (llm/)

**설명**: Vercel AI SDK 기반 LLM 클라이언트를 구현한다. `generateObject()` + Zod structured output 래퍼, 프로바이더 설정, 재시도/폴백 로직을 포함한다.

**생성/수정 파일**:
- `src/llm/client.ts` — `callLLM<T>()` 제네릭 함수, `generateObject()` 래핑
- `src/llm/providers.ts` — OpenAI/Anthropic 프로바이더 생성, 모델 ID 매핑
- `src/llm/retry.ts` — `withRetry()`, 지수 백오프, Rate Limit Retry-After 존중, `isRetryable()` 판별
- `src/llm/fallback.ts` — `callWithFallback()`, 모델 폴백 체인
- `src/llm/types.ts` — `ModelConfig`, `LLMCallOptions` 인터페이스
- `src/llm/usage-tracker.ts` — `UsageTracker` 클래스, 토큰 사용량/비용 추적, 요약 출력
- `src/llm/index.ts` — re-export
- `tests/llm/client.test.ts` — mock 기반 LLM 호출 테스트
- `tests/llm/retry.test.ts` — 재시도 로직 테스트

**의존 태스크**: M0-01, M0-02, M0-03

**완료 기준**:
- `callLLM()`에 Zod 스키마를 전달하면 타입 안전한 객체를 반환
- 429/500 에러 시 지수 백오프로 재시도 (최대 3회)
- 401 에러 시 재시도 없이 즉시 에러
- `UsageTracker`가 입력/출력 토큰, 추정 비용, 소요 시간을 기록
- 간단한 테스트 스키마(`z.object({ greeting: z.string() })`)로 실제 LLM 호출 성공 (통합 테스트)

---

### M0-08: 파이프라인 오케스트레이터 (pipeline/) — Stub

**설명**: 4-Phase 순차 실행 오케스트레이터를 구현한다. 각 Phase는 stub(더미 결과 반환)으로 구성하되, `PipelineContext`를 통한 데이터 전달, Phase별 타이밍 측정, `--docs-only`/`--prompts-only` 분기 처리를 포함한다.

**생성/수정 파일**:
- `src/pipeline/orchestrator.ts` — `runPipeline()` 함수, Phase 순차 실행, PhaseResult 수집
- `src/pipeline/context.ts` — `PipelineContext` 생성/관리, Phase 간 데이터 전달
- `src/phases/extraction/index.ts` — Phase 1 stub (더미 `ExtractionResult` 반환)
- `src/phases/analysis/index.ts` — Phase 2 stub (더미 `AnalysisResult` 반환)
- `src/phases/documentation/index.ts` — Phase 3 stub (더미 `DocumentSet` 반환)
- `src/phases/prompt-gen/index.ts` — Phase 4 stub (더미 `PromptSet` 반환)
- `tests/pipeline/orchestrator.test.ts` — 파이프라인 순차 실행 테스트

**의존 태스크**: M0-02, M0-03

**완료 기준**:
- `runPipeline(config)` 호출 시 4개 Phase가 순차 실행되고, 각 결과가 `PipelineContext`에 누적
- 각 Phase의 시작/완료 시간이 `PhaseResult.durationMs`에 기록
- `--docs-only` 시 Phase 1~3만 실행, `--prompts-only` 시 Phase 4만 실행
- Phase 실패 시 파이프라인 중단 및 에러 전파

---

### M0-09: analyze 명령어 ↔ 파이프라인 연결

**설명**: `ditto analyze` 명령어에서 설정을 로드하고, `PipelineConfig`를 구성하여 오케스트레이터를 호출하는 전체 흐름을 연결한다. 에러 핸들링 및 최종 결과 요약 출력을 포함한다.

**생성/수정 파일**:
- `src/cli/commands/analyze.ts` — 파이프라인 호출 로직 추가
- `src/cli/formatter.ts` — `printHeader()`, `printSummary()` 구현
- `src/cli/errors.ts` — `handleError()` 전역 에러 핸들러 (UserError/SystemError/LLMError 분기)

**의존 태스크**: M0-06, M0-08

**완료 기준**:
- `ditto analyze ./test-dir` 실행 시 헤더 출력 → 4 Phase stub 실행 → 결과 요약 출력
- 에러 발생 시 `handleError()`가 에러 유형별 메시지 포맷 적용
- 종료 코드가 정상(0), 일반 에러(1), Health Check fail(2)로 분류

---

### M0-10: Zod 스키마 정의 (llm/schemas/)

**설명**: LLM `generateObject()`에 사용할 Zod 스키마를 정의한다. `03-type-definitions.md`의 TypeScript 인터페이스와 1:1 매핑되는 Zod 스키마를 작성한다.

**생성/수정 파일**:
- `src/llm/schemas/common.ts` — `confidenceLevelSchema`, `confident()` 래퍼
- `src/llm/schemas/extraction.ts` — Phase 1 관련 스키마 (TechStack 등)
- `src/llm/schemas/analysis.ts` — Phase 2 분석 결과 스키마 (DesignTokens, ComponentCatalog, LayoutSystem, PageStructures, ResponsiveStrategy, InteractionPatterns, DesignEssence)
- `src/llm/schemas/documentation.ts` — Phase 3 문서 생성 스키마 (섹션별 마크다운 필드)
- `src/llm/schemas/prompts.ts` — Phase 4 Prompt 생성 스키마 (StepPlan, PromptStep)
- `src/llm/schemas/index.ts` — re-export
- `tests/llm/schemas.test.ts` — 스키마 검증 테스트 (유효/무효 데이터로 parse 확인)

**의존 태스크**: M0-02, M0-07

**완료 기준**:
- 모든 Zod 스키마가 `03-type-definitions.md`의 인터페이스와 정확히 대응
- `z.infer<typeof schema>` 결과가 해당 TypeScript 인터페이스와 일치
- `.describe()` 어노테이션이 LLM에 충분한 힌트를 제공
- 유효한 더미 데이터와 무효한 데이터에 대한 파싱 테스트 통과

---

### M0-11: LLM 프롬프트 템플릿 기반 구조

**설명**: LLM 프롬프트 관리 체계를 구축한다. 시스템 프롬프트 빌더, 공통 원칙/출력 규칙, 버전 관리 디렉토리 구조를 설정한다. 실제 분석기별 프롬프트 내용은 M1에서 작성한다.

**생성/수정 파일**:
- `src/llm/prompts/system.ts` — `buildSystemPrompt()`, `SHARED_PRINCIPLES`, `SHARED_OUTPUT_RULES`
- `src/llm/prompts/v1/index.ts` — v1 프롬프트 버전 export
- `src/llm/prompts/v1/analyzers/` — 각 분석기 프롬프트 파일 (빈 템플릿)
- `src/llm/prompts/v1/generators/` — Phase 3/4 프롬프트 파일 (빈 템플릿)
- `src/llm/prompts/index.ts` — 현재 활성 버전 export

**의존 태스크**: M0-07

**완료 기준**:
- `buildSystemPrompt({ role, principles, outputRules })` 함수가 규격에 맞는 시스템 프롬프트 문자열 생성
- `SHARED_PRINCIPLES`, `SHARED_OUTPUT_RULES`가 `05-llm-integration.md` 2.1절과 일치
- 프롬프트 버전 디렉토리(`v1/`)가 정상 구성

---

### M0-12: 통합 검증 — M0 전체 흐름

**설명**: M0의 모든 컴포넌트가 조합되어 동작하는지 end-to-end로 검증한다. 테스트용 더미 디렉토리를 만들고 전체 흐름을 실행한다.

**생성/수정 파일**:
- `tests/e2e/m0-pipeline.test.ts` — 전체 파이프라인 stub 실행 E2E 테스트
- `tests/fixtures/test-repo/` — 테스트용 최소 FE 프로젝트 구조 (package.json, 컴포넌트 1개, 스타일 1개)

**의존 태스크**: M0-09, M0-10, M0-11

**완료 기준**:
- `ditto analyze ./tests/fixtures/test-repo` 실행 시 4 Phase stub이 순차 실행
- 헤더, 진행 상태, 결과 요약이 콘솔에 올바르게 출력
- LLM 클라이언트로 간단한 스키마 테스트 호출 성공 (실제 API 키 필요한 통합 테스트는 선택적)
- `ditto config list`로 현재 설정 확인 가능
- 빌드 후 `node dist/cli/index.js analyze ./tests/fixtures/test-repo` 동작 확인

---

## M1: Core Analysis — 분석 엔진

Phase 1(Extraction) + Phase 2(Analysis)를 완전히 구현한다.

---

### M1-01: Repo Resolver (로컬 경로 / GitHub URL)

**설명**: 분석 대상을 로컬 디렉토리로 확보하는 Repo Resolver를 구현한다. 로컬 경로는 존재/유효성 검증, GitHub URL은 `giget`으로 다운로드한다.

**생성/수정 파일**:
- `src/phases/extraction/repo-resolver.ts` — `resolveRepo()` 함수
  - 로컬 경로: 존재 여부, 디렉토리 여부, package.json 존재 여부 확인
  - GitHub URL: `giget`으로 tar 기반 다운로드 → 임시 디렉토리에 저장
  - 반환: 분석 가능한 로컬 디렉토리 절대 경로
- `tests/phases/extraction/repo-resolver.test.ts`

**의존 태스크**: M0-03

**완료 기준**:
- 유효한 로컬 경로 → 절대 경로 반환
- 존재하지 않는 경로 → `UserError` with hint
- `https://github.com/user/repo` → giget 다운로드 → 로컬 디렉토리 경로 반환
- 유효하지 않은 URL → `UserError` with hint
- Monorepo + `--package` 옵션 시 하위 패키지 경로로 결정

---

### M1-02: File Scanner (파일 트리 스캔 및 필터링)

**설명**: `tinyglobby` 기반 파일 트리 스캔, FE 관련 파일 필터링, `FileTreeNode` 구조를 생성한다. `node_modules`, `.git`, 빌드 산출물 등은 제외한다.

**생성/수정 파일**:
- `src/phases/extraction/file-scanner.ts` — `scanFiles()` 함수
  - 전체 파일 목록 수집
  - 제외 패턴: `node_modules/`, `.git/`, `dist/`, `.next/`, `build/`, `coverage/` 등
  - `FileTreeNode[]` 트리 구조 생성
  - `ExtractionStats` 통계 산출
- `tests/phases/extraction/file-scanner.test.ts`

**의존 태스크**: M0-02, M0-03

**완료 기준**:
- 테스트 디렉토리에서 파일 트리 스캔 → `FileTreeNode[]` 반환
- `node_modules`, `.git` 등 제외 확인
- 파일 확장자, 크기 정보 포함
- 빈 디렉토리/파일 없는 경우 적절한 에러

---

### M1-03: 파일 분류기 (File Classifier)

**설명**: 스캔된 파일을 `FileCategory`(config-styling, component-ui, page-route 등 16개 카테고리)로 분류한다. 경로 패턴 + 내용 힌트 기반 규칙 엔진을 구현한다.

**생성/수정 파일**:
- `src/phases/extraction/file-classifier.ts` — `classifyFiles()` 함수
  - 경로 패턴 매칭 규칙 (tailwind.config.*, components/ui/**, pages/**, app/**/page.* 등)
  - 내용 힌트 매칭 (`:root`, `@layer base`, `framer-motion` import 등)
  - `ClassifiedFile[]` 반환 (path, category, sizeBytes, estimatedTokens)
- `tests/phases/extraction/file-classifier.test.ts`

**의존 태스크**: M1-02

**완료 기준**:
- `tailwind.config.ts` → `config-styling` 분류
- `src/components/ui/Button.tsx` → `component-ui` 분류
- `src/app/page.tsx` → `page-route` 분류
- `globals.css` with `:root` → `styling-global` 분류
- 분류 불가 파일 → `other` 분류
- 추정 토큰 수(`bytes / 4`)가 산출됨

---

### M1-04: Code Extractor

**설명**: 컴포넌트 소스 코드와 스타일 코드를 `CodeChunk` 단위로 추출한다. 파일 전체를 읽거나, 대형 파일은 관련 섹션만 추출하는 전략을 적용한다.

**생성/수정 파일**:
- `src/phases/extraction/code-extractor.ts` — `extractCode()` 함수
  - 분류된 파일에서 `CodeChunk[]` 생성
  - 대형 파일(> 8,000 토큰 추정): 관련 섹션만 추출
  - 컴포넌트 파일: import문 + export 컴포넌트 함수 + JSX return
  - 스타일 파일: 전체 (보통 작음)
- `src/phases/extraction/file-truncation.ts` — `extractRelevantSections()` 대형 파일 섹션 추출
- `tests/phases/extraction/code-extractor.test.ts`

**의존 태스크**: M1-03

**완료 기준**:
- 소형 파일(< 2,000 토큰) → 전체 내용 포함
- 대형 파일 → 관련 섹션만 추출, `truncated: true` 표시
- `CodeChunk.fileType`이 올바르게 분류 (component, style, config 등)
- tailwind.config → `theme.extend` 섹션 위주 추출

---

### M1-05: Config Extractor

**설명**: `tailwind.config`, `package.json`, `tsconfig`, `next.config`, `postcss.config` 등 설정 파일의 내용을 추출한다.

**생성/수정 파일**:
- `src/phases/extraction/config-extractor.ts` — `extractConfigs()` 함수
  - `config-*` 카테고리 파일의 내용을 `ConfigFile[]`로 추출
  - `package.json`에서 `dependencies`, `devDependencies` 파싱
- `tests/phases/extraction/config-extractor.test.ts`

**의존 태스크**: M1-03

**완료 기준**:
- `tailwind.config.ts` → `ConfigFile { configType: 'tailwind-config', content: '...' }`
- `package.json` → `ConfigFile { configType: 'package-json', content: '...' }`
- CSS Variables 정의 파일 → `ConfigFile { configType: 'css-variables', content: '...' }`

---

### M1-06: Tech Stack Detector

**설명**: `package.json` dependencies 및 설정 파일 존재 여부를 기반으로 기술 스택(프레임워크, 스타일링, UI 라이브러리, 애니메이션 라이브러리 등)을 감지한다.

**생성/수정 파일**:
- `src/phases/extraction/tech-stack-detector.ts` — `detectTechStack()` 함수
  - 프레임워크 감지: Next.js, Vite, Astro, Svelte, Vue (package.json + config 파일 기반)
  - 스타일링 감지: Tailwind CSS, CSS Modules, Styled Components, Emotion 등 + `StylingTier` 분류
  - UI 라이브러리 감지: shadcn/ui, Radix, MUI, Chakra 등
  - 애니메이션 라이브러리: Framer Motion, GSAP 등
  - `TechStack` 인터페이스 반환
- `tests/phases/extraction/tech-stack-detector.test.ts`

**의존 태스크**: M1-05

**완료 기준**:
- Next.js 프로젝트 → `framework: { value: 'Next.js', confidenceLevel: 'high' }`
- Tailwind CSS 사용 → `styling: [{ name: 'Tailwind CSS', tier: 'tier1' }]`, confidence `high`
- 다중 스타일링 방식 감지 가능 (Tailwind + CSS Modules)
- UI 라이브러리 미사용 시 빈 배열

---

### M1-07: Health Check

**설명**: Phase 1 완료 후 Phase 2 진입 전, 추출 결과의 분석 가능성을 판정하는 Health Check를 구현한다.

**생성/수정 파일**:
- `src/pipeline/health-check.ts` — `runHealthCheck()` 함수
  - FE 프로젝트 여부 (React/Vue/Svelte 등 의존성)
  - 스타일링 파일 존재 여부
  - 컴포넌트 파일 존재 여부 (최소 1개)
  - 각 항목별 pass/warn/fail 판정
  - 전체 결과 종합 → `HealthCheckResult`
- `tests/pipeline/health-check.test.ts`

**의존 태스크**: M1-06

**완료 기준**:
- FE 프로젝트 + 스타일 파일 + 컴포넌트 파일 → `status: 'pass'`
- 컴포넌트 파일 5개 미만 → `status: 'warn'` + 경고 메시지
- FE 프레임워크 미감지 → `status: 'fail'` + 사유
- 스타일링 파일 0개 → `status: 'fail'` + 사유

---

### M1-08: Phase 1 통합 — Extraction 완성

**설명**: Repo Resolver, File Scanner, File Classifier, Code/Config Extractor, Tech Stack Detector를 조합하여 Phase 1 진입점(`phases/extraction/index.ts`)을 완성한다.

**생성/수정 파일**:
- `src/phases/extraction/index.ts` — `runExtraction()` 함수 (stub 제거, 실제 구현)
  - RepoResolver → FileScanner → FileClassifier → CodeExtractor + ConfigExtractor → TechStackDetector
  - `ExtractionResult` 반환
- `tests/phases/extraction/index.test.ts` — Phase 1 통합 테스트

**의존 태스크**: M1-01, M1-02, M1-03, M1-04, M1-05, M1-06, M1-07

**완료 기준**:
- 테스트용 FE 레포에서 `runExtraction()` → 올바른 `ExtractionResult` 반환
- `ExtractionStats`의 각 카운트(totalFiles, relevantFiles, codeChunks 등)가 현실적
- Health Check pass 시 정상 완료, fail 시 `UserError` throw
- 진행 상태(파일 스캔 중, N개 파일 감지 등) 콘솔 출력

---

### M1-09: 컨텍스트 빌더 (Context Builder)

**설명**: 분석기별로 LLM 컨텍스트를 구성하는 Context Builder를 구현한다. 분석기별 파일 우선순위에 따라 토큰 예산 내에서 파일을 선택하고, 프롬프트를 조립한다.

**생성/수정 파일**:
- `src/llm/context-builder.ts` — `buildContextForAnalyzer()` 함수
  - 분석기별 파일 우선순위(`ANALYZER_FILE_PRIORITIES`) 정의
  - 토큰 예산 내 파일 선택 알고리즘
  - 파일 구조 요약(`buildFileStructureSummary()`)
  - `ContextBuildResult` 반환
- `src/llm/sampling.ts` — 대형 레포 대표 샘플링 (`representative` 전략)
- `src/llm/context-summarizer.ts` — 분석 결과 요약 변환 (Essence Synthesizer / Phase 3,4용)
- `tests/llm/context-builder.test.ts`

**의존 태스크**: M0-07, M1-03

**완료 기준**:
- Token Analyzer에 `config-styling`, `styling-theme` 카테고리 파일이 최우선 포함
- 토큰 예산 초과 시 낮은 우선순위 파일이 제외됨
- 파일 구조 요약이 트리 형태로 3단계까지 표시
- 대형 레포(컴포넌트 100개+) 시 50개 이내로 샘플링

---

### M1-10: Token Analyzer + Typography Analyzer

**설명**: 디자인 토큰(Color, Spacing, BorderRadius, Shadow, Border, Opacity, ZIndex) 분석기와 타이포그래피 분석기를 구현한다.

**생성/수정 파일**:
- `src/phases/analysis/analyzers/token-analyzer.ts` — `analyzeTokens()` 함수
- `src/phases/analysis/analyzers/typography-analyzer.ts` — `analyzeTypography()` 함수
- `src/llm/prompts/v1/analyzers/token.ts` — Token Analyzer 시스템/유저 프롬프트
- `src/llm/prompts/v1/analyzers/typography.ts` — Typography Analyzer 프롬프트
- `tests/phases/analysis/token-analyzer.test.ts`
- `tests/phases/analysis/typography-analyzer.test.ts`

**의존 태스크**: M0-10, M0-11, M1-09

**완료 기준**:
- Tailwind CSS 프로젝트에서 컬러 팔레트, spacing 스케일, border-radius 추출 (confidence: high)
- CSS Variables 기반 프로젝트에서 토큰 추출
- 하드코딩만 있는 프로젝트에서 패턴 추론 (confidence: medium/low)
- 폰트 패밀리, heading/body 스케일, 타이포그래피 성격 서술 생성
- 각 토큰의 `moodDescription`, `characterDescription` 등 자연어 서술 포함

---

### M1-11: Component Analyzer

**설명**: UI 컴포넌트 구조 및 패턴 분석기를 구현한다. 컴포넌트 목록, 카테고리 분류, 디자인 특징, variants/states, 시각적 무게를 분석한다.

**생성/수정 파일**:
- `src/phases/analysis/analyzers/component-analyzer.ts` — `analyzeComponents()` 함수
- `src/llm/prompts/v1/analyzers/component.ts` — Component Analyzer 프롬프트
- `tests/phases/analysis/component-analyzer.test.ts`

**의존 태스크**: M0-10, M0-11, M1-09

**완료 기준**:
- 컴포넌트 목록이 `ComponentCatalog`의 카테고리별로 분류됨 (primitive, composite, layout 등)
- 각 컴포넌트에 `designDescription`, `visualWeight`, `variants`, `states` 포함
- `usedIn` 필드로 사용처(페이지/섹션) 파악
- 컴포넌트 간 조합 관계(`subComponents`) 식별

---

### M1-12: Layout Analyzer + Page Analyzer

**설명**: 레이아웃 시스템(그리드, 컨테이너, 간격 리듬, 시각적 계층) 분석기와 페이지 구성(페이지별 섹션, 컴포넌트 배치) 분석기를 구현한다.

**생성/수정 파일**:
- `src/phases/analysis/analyzers/layout-analyzer.ts` — `analyzeLayout()` 함수
- `src/phases/analysis/analyzers/page-analyzer.ts` — `analyzePages()` 함수
- `src/llm/prompts/v1/analyzers/layout.ts` — Layout Analyzer 프롬프트
- `src/llm/prompts/v1/analyzers/page.ts` — Page Analyzer 프롬프트
- `tests/phases/analysis/layout-analyzer.test.ts`
- `tests/phases/analysis/page-analyzer.test.ts`

**의존 태스크**: M0-10, M0-11, M1-09

**완료 기준**:
- 그리드 시스템(CSS Grid/Flexbox/hybrid), 컨테이너 전략(max-width 등), 간격 리듬 분석
- 반복 레이아웃 패턴(2-column hero, card grid 등) 식별
- 시각적 계층 구조(시선 흐름, 정보 우선순위) 서술
- 페이지별 섹션 구성(순서, 역할, 사용 컴포넌트) 분석
- 섹션 간 시각적 구분 방법(배경색 교차, 구분선, 여백) 파악

---

### M1-13: Responsive Analyzer + Interaction Analyzer

**설명**: 반응형 전략(breakpoints, 접근 방식, 패턴) 분석기와 인터랙션/애니메이션(모션 스타일, hover 효과, 진입 애니메이션, 스크롤 동작) 분석기를 구현한다.

**생성/수정 파일**:
- `src/phases/analysis/analyzers/responsive-analyzer.ts` — `analyzeResponsive()` 함수
- `src/phases/analysis/analyzers/interaction-analyzer.ts` — `analyzeInteractions()` 함수
- `src/llm/prompts/v1/analyzers/responsive.ts` — Responsive Analyzer 프롬프트
- `src/llm/prompts/v1/analyzers/interaction.ts` — Interaction Analyzer 프롬프트
- `tests/phases/analysis/responsive-analyzer.test.ts`
- `tests/phases/analysis/interaction-analyzer.test.ts`

**의존 태스크**: M0-10, M0-11, M1-09

**완료 기준**:
- 반응형 접근 방식(mobile-first/desktop-first) 판별
- breakpoint 정의 추출 (Tailwind screens 또는 미디어 쿼리)
- 반응형 미지원 레포 → `null` 반환
- 전체 모션 스타일(restrained/moderate/expressive) 판별
- hover 효과, 진입 애니메이션, 스크롤 동작, 마이크로인터랙션 패턴 식별
- Framer Motion/GSAP 등 라이브러리 활용 패턴 분석

---

### M1-14: Essence Synthesizer

**설명**: 6개 개별 분석기의 결과를 종합하여 디자인 에센스(정체성, 원칙, 무드, Do's & Don'ts)를 도출하는 Essence Synthesizer를 구현한다. 이 분석기는 코드가 아닌 다른 분석 결과를 입력으로 받는다.

**생성/수정 파일**:
- `src/phases/analysis/essence-synthesizer.ts` — `synthesizeEssence()` 함수
  - 입력: 6개 분석기의 결과 (요약된 형태)
  - 출력: `DesignEssence`
- `src/llm/prompts/v1/analyzers/essence.ts` — Essence Synthesizer 프롬프트 (temperature 0.4)
- `tests/phases/analysis/essence-synthesizer.test.ts`

**의존 태스크**: M1-10, M1-11, M1-12, M1-13

**완료 기준**:
- `identity` 한 줄 요약이 디자인의 핵심을 포착 (예: "절제된 여백과 네이비 컬러의 신뢰감 있는 SaaS 대시보드")
- `principles` 3~5개의 디자인 원칙이 구체적
- `moodKeywords` 4~6개의 키워드
- `visualCharacteristics` 6개 축(colorMood, typographyCharacter, spacingCharacter, shape, depth, motion) 모두 서술
- `dosAndDonts` 5개 카테고리(color, typography, spacing, component, motion)별 Do's/Don'ts 포함
- 모호한 표현("적절하게", "자연스럽게") 없이 구체적 기준 포함

---

### M1-15: Phase 2 통합 — Analysis 완성

**설명**: 6개 분석기 + Essence Synthesizer를 조합하여 Phase 2 진입점을 완성한다. 독립 분석기 병렬 실행, Partial Failure 처리, `analysis.json` 출력을 포함한다.

**생성/수정 파일**:
- `src/phases/analysis/index.ts` — `runAnalysis()` 함수 (stub 제거, 실제 구현)
  - 6개 독립 분석기 `Promise.allSettled()` 병렬 실행
  - 개별 실패 시 해당 항목 `null` + 경고 로그
  - 핵심 분석기(token, component) 모두 실패 시 파이프라인 중단
  - Essence Synthesizer 순차 실행
  - `AnalysisResult` 구성 → `analysis.json` 파일 저장
- `tests/phases/analysis/index.test.ts` — Phase 2 통합 테스트

**의존 태스크**: M1-08, M1-10, M1-11, M1-12, M1-13, M1-14

**완료 기준**:
- 실제 FE 레포에서 Phase 1 → Phase 2 실행 시 `AnalysisResult` 생성
- `analysis.json`이 올바른 JSON으로 저장
- 개별 분석기 실패 시 나머지 분석 결과로 Partial 결과 생성
- 모든 분석기 결과에 `confidenceLevel` 포함
- 분석 소요 시간, 토큰 사용량이 `AnalysisMeta`에 기록

---

### M1-16: Phase 1 + 2 파이프라인 연결 및 E2E 테스트

**설명**: Phase 1과 Phase 2를 파이프라인 오케스트레이터에 연결하고, 실제 FE 레포를 대상으로 E2E 테스트를 수행한다.

**생성/수정 파일**:
- `src/pipeline/orchestrator.ts` — Phase 1, 2에서 stub 호출 → 실제 구현 호출로 교체
- `tests/e2e/m1-analysis.test.ts` — Phase 1 + 2 E2E 테스트
- `tests/fixtures/` — 추가 테스트 fixture (Tailwind 프로젝트, CSS Modules 프로젝트)

**의존 태스크**: M1-08, M1-15

**완료 기준**:
- `ditto analyze ./tests/fixtures/tailwind-repo` 실행 시 Phase 1 + 2가 완전히 동작
- `ditto-output/<name>/analysis.json` 파일이 생성됨
- 분석 결과가 레퍼런스의 실제 디자인을 합리적으로 반영 (수동 검증)
- Health Check warn 시 경고 메시지 출력 후 계속 진행
- 진행 상태(Phase별 시작/완료, 분석기별 진행) 콘솔 출력

---

### M1-17: 벤치마크 레포 테스트 및 분석 품질 튜닝

**설명**: 3~5개의 실제 공개 FE 레포를 벤치마크 대상으로 선정하고, 분석 품질을 검증/튜닝한다. 프롬프트 조정, 컨텍스트 빌더 파라미터 최적화를 수행한다.

**생성/수정 파일**:
- `tests/benchmark/repos.ts` — 벤치마크 대상 레포 목록 정의
- `tests/benchmark/run-benchmark.ts` — 벤치마크 실행 스크립트
- `src/llm/prompts/v1/analyzers/*.ts` — 프롬프트 튜닝 반영
- `src/llm/context-builder.ts` — 파라미터 최적화 (우선순위, 예산 배분)

**의존 태스크**: M1-16

**완료 기준**:
- 3개 이상 다양한 스타일의 공개 레포에서 분석 실행 완료
- 각 레포의 분석 결과가 수동 검증 기준 합리적 (명백한 오류 없음)
- Tailwind(tier1) 프로젝트에서 주요 토큰이 `confidence: high`로 추출
- 토큰 사용량 및 비용이 레포별로 기록됨

---

## M2: Document & Prompt Generation — 문서/Prompt 생성

Phase 3(Documentation) + Phase 4(Prompt Generation)를 완전히 구현한다.

---

### M2-01: Doc Planner (문서 구성 계획)

**설명**: 분석 결과를 기반으로 문서 구성을 동적으로 결정하는 Doc Planner를 구현한다. 기본 7개 문서 중 해당 없는 문서는 제외하고, 필요 시 동적 문서를 추가한다.

**생성/수정 파일**:
- `src/phases/documentation/doc-planner.ts` — `planDocuments()` 함수
  - `AnalysisResult` 입력 → `DocumentPlan` 출력
  - `responsiveStrategy`가 null이면 06-responsive-strategy.md 제외
  - `interactionPatterns`가 빈약하면 07-interactions.md 제외
  - 다크모드가 감지되면 동적 문서 추가
  - 각 포함/제외 사유 기록
- `tests/phases/documentation/doc-planner.test.ts`

**의존 태스크**: M0-02

**완료 기준**:
- 반응형 미지원 분석 결과 → 06 문서 excluded 목록에 포함
- 다크모드 지원 분석 결과 → 동적 dark-mode 문서 추가
- 포함/제외 사유가 각 `DocumentSpec`에 기록
- 최소 5개(overview, tokens, typography, component-catalog, layout-system)는 항상 포함

---

### M2-02: 문서 생성기 — Overview + Design Tokens

**설명**: 00-overview.md와 01-design-tokens.md를 생성하는 generator를 구현한다. LLM을 호출하여 analysis.json의 관련 데이터를 마크다운 문서로 변환한다.

**생성/수정 파일**:
- `src/phases/documentation/generators/overview-gen.ts` — overview 문서 생성
  - 입력: `DesignEssence`, `TechStack`, `AnalysisMeta`
  - 출력: `DocumentEntry` (00-overview.md 내용)
- `src/phases/documentation/generators/tokens-gen.ts` — design tokens 문서 생성
  - 입력: `DesignTokens`, `DesignEssence`
  - 출력: `DocumentEntry` (01-design-tokens.md 내용)
- `src/llm/prompts/v1/generators/doc.ts` — 문서 생성용 프롬프트 (overview, tokens 부분)
- `tests/phases/documentation/generators/overview-gen.test.ts`
- `tests/phases/documentation/generators/tokens-gen.test.ts`

**의존 태스크**: M0-10, M0-11, M2-01

**완료 기준**:
- overview 문서에 디자인 정체성, 무드 키워드, 스타일 카테고리, 기술 스택 요약 포함
- tokens 문서에 컬러 팔레트(테이블+설명), spacing 스케일, border-radius, shadow, border 패턴 포함
- 값 나열뿐 아니라 "왜 이 값들이 이런 느낌을 주는지" 자연어 설명 포함
- 생성된 마크다운이 유효하고 사람이 읽기 편한 포맷

---

### M2-03: 문서 생성기 — Typography + Component Catalog

**설명**: 02-typography.md와 03-component-catalog.md를 생성하는 generator를 구현한다.

**생성/수정 파일**:
- `src/phases/documentation/generators/typography-gen.ts` — typography 문서 생성
  - 입력: `TypographyTokens`, `DesignEssence`
- `src/phases/documentation/generators/components-gen.ts` — component catalog 문서 생성
  - 입력: `ComponentCatalog`, `DesignEssence`
- `src/llm/prompts/v1/generators/doc.ts` — 해당 문서 프롬프트 추가
- `tests/phases/documentation/generators/typography-gen.test.ts`
- `tests/phases/documentation/generators/components-gen.test.ts`

**의존 태스크**: M0-10, M0-11, M2-01

**완료 기준**:
- typography 문서에 폰트 패밀리, heading/body 스케일(테이블), 타이포그래피 원칙 포함
- component catalog에 카테고리별 컴포넌트 목록, 각 컴포넌트의 디자인 특징, variants/states 포함
- 양산 가능성에 초점 — "이 문서를 읽고 같은 스타일의 새 컴포넌트를 만들 수 있는지" 검증

---

### M2-04: 문서 생성기 — Layout + Pages + Responsive + Interactions

**설명**: 04-layout-system.md, 05-page-structures.md, 06-responsive-strategy.md, 07-interactions.md를 생성하는 generator를 구현한다.

**생성/수정 파일**:
- `src/phases/documentation/generators/layout-gen.ts`
- `src/phases/documentation/generators/pages-gen.ts`
- `src/phases/documentation/generators/responsive-gen.ts`
- `src/phases/documentation/generators/interactions-gen.ts`
- `src/llm/prompts/v1/generators/doc.ts` — 해당 문서 프롬프트 추가
- `tests/phases/documentation/generators/` — 각 generator 테스트

**의존 태스크**: M0-10, M0-11, M2-01

**완료 기준**:
- layout 문서에 그리드 시스템, 컨테이너, 간격 리듬, 반복 패턴, 시각적 계층 포함
- pages 문서에 페이지별 섹션 구성(순서, 역할, 컴포넌트), 섹션 구분 방법 포함
- responsive 문서에 접근 방식, breakpoints, 패턴, 반응형 타이포/간격 포함
- interactions 문서에 모션 스타일, hover 효과, 진입 애니메이션, 스크롤 동작, 모션 원칙 포함

---

### M2-05: 동적 문서 생성기 + 문서 Writer

**설명**: 동적 추가 문서(dark-mode, form 등) 생성기와 파일 시스템 출력기(writer)를 구현한다.

**생성/수정 파일**:
- `src/phases/documentation/generators/dynamic-gen.ts` — 동적 문서 생성
  - Doc Planner가 결정한 동적 문서 목록에 따라 LLM 호출
  - 자동 번호 매기기(08-, 09- 등)
- `src/phases/documentation/writer.ts` — `writeDocuments()` 함수
  - `design-spec/` 디렉토리 생성
  - 각 `DocumentEntry`를 마크다운 파일로 출력
- `tests/phases/documentation/writer.test.ts`

**의존 태스크**: M2-01

**완료 기준**:
- 동적 문서가 올바른 번호로 생성 (08-dark-mode.md 등)
- `design-spec/` 디렉토리에 모든 문서가 파일로 저장
- 기존 디렉토리가 있으면 덮어쓰기 (사용자 확인 후)
- 파일 쓰기 실패 시 `SystemError` throw

---

### M2-06: Phase 3 통합 — Documentation 완성

**설명**: Doc Planner + 모든 Generator + Writer를 조합하여 Phase 3 진입점을 완성한다.

**생성/수정 파일**:
- `src/phases/documentation/index.ts` — `runDocumentation()` 함수 (stub 제거, 실제 구현)
  - Doc Planner로 문서 계획 → Generator로 각 문서 생성 → Writer로 파일 출력
  - `DocumentSet` 반환
- `tests/phases/documentation/index.test.ts` — Phase 3 통합 테스트

**의존 태스크**: M2-01, M2-02, M2-03, M2-04, M2-05

**완료 기준**:
- `AnalysisResult` 입력 → `design-spec/` 디렉토리에 5~8개 마크다운 문서 생성
- 각 문서가 읽기 좋은 마크다운 포맷
- 반응형 미지원 레포에서 06-responsive-strategy.md 미생성 확인
- 진행 상태(문서 구성 계획 → N개 문서 생성 중 → 완료) 콘솔 출력

---

### M2-07: Step Planner (단계 계획)

**설명**: 분석 결과의 복잡도에 따라 Prompt 단계 수와 분할을 계획하는 Step Planner를 구현한다.

**생성/수정 파일**:
- `src/phases/prompt-gen/step-planner.ts` — `planSteps()` 함수
  - `AnalysisResult` 입력 → `StepPlan` 출력
  - 기본 단계: project-setup, design-system (항상)
  - 가변 단계: base-components, layout-components, composite-components, page-implementation, responsive, interactions
  - 분할 규칙: 단계당 생성 파일 5~15개 목표, 초과 시 분할 (`base-components-1`, `base-components-2`)
  - 총 4~12단계
- `tests/phases/prompt-gen/step-planner.test.ts`

**의존 태스크**: M0-02

**완료 기준**:
- 소규모 프로젝트(컴포넌트 10개 미만) → 4~6단계
- 대규모 프로젝트(컴포넌트 30개+) → 8~12단계, 컴포넌트 단계 분할
- 반응형 미지원 → responsive 단계 제외
- 각 단계에 `prerequisites`(선행 단계) 올바르게 지정
- `estimatedFileCount`가 5~15 범위 내

---

### M2-08: Context Injector

**설명**: 각 Prompt에 필요한 디자인 정보를 analysis.json과 design-spec 문서에서 선별하여 삽입하는 Context Injector를 구현한다.

**생성/수정 파일**:
- `src/phases/prompt-gen/context-injector.ts` — `injectContext()` 함수
  - 각 Step에 필요한 analysis.json 섹션 매핑
  - project-setup → TechStack, DesignEssence 요약
  - design-system → DesignTokens, Typography 전체
  - base-components → 해당 컴포넌트의 ComponentEntry + 관련 토큰
  - page-implementation → PageStructures + 관련 컴포넌트
  - 등등
- `tests/phases/prompt-gen/context-injector.test.ts`

**의존 태스크**: M2-07

**완료 기준**:
- 각 Step에 자기 완결적으로 필요한 디자인 정보가 포함
- design-system Step에 컬러 팔레트, spacing 스케일 등 전체 토큰 인라인 포함
- components Step에 해당 컴포넌트의 variants, states, 디자인 설명 인라인 포함
- 불필요한 정보는 제외하여 토큰 예산 절약

---

### M2-09: Prompt 생성기 — Setup + Design System

**설명**: step-01-project-setup.md와 step-02-design-system.md를 생성하는 Prompt generator를 구현한다.

**생성/수정 파일**:
- `src/phases/prompt-gen/generators/setup-prompt.ts` — project setup Prompt 생성
- `src/phases/prompt-gen/generators/design-system-prompt.ts` — design system Prompt 생성
- `src/llm/prompts/v1/generators/prompt.ts` — Prompt 생성용 메타 프롬프트
- `tests/phases/prompt-gen/generators/setup-prompt.test.ts`
- `tests/phases/prompt-gen/generators/design-system-prompt.test.ts`

**의존 태스크**: M0-10, M0-11, M2-07, M2-08

**완료 기준**:
- setup Prompt에 프로젝트 생성 명령어, 의존성 설치, 기본 구조 설정이 구체적으로 포함
- design-system Prompt에 모든 디자인 토큰 값, 타이포그래피 스케일, 전역 CSS 설정이 인라인 포함
- 각 Prompt가 표준 구조(Goal, Prerequisites, Context, Instructions, Design Reference, Expected Outcome, Validation) 준수
- AI Coding Agent 범용 (특정 도구 전용 지시 없음)

---

### M2-10: Prompt 생성기 — Components + Pages + Responsive + Interactions

**설명**: 컴포넌트, 페이지 구현, 반응형, 인터랙션 관련 Step Prompt를 생성하는 generator를 구현한다.

**생성/수정 파일**:
- `src/phases/prompt-gen/generators/components-prompt.ts` — base/layout/composite components Prompt
- `src/phases/prompt-gen/generators/pages-prompt.ts` — page implementation Prompt
- `src/phases/prompt-gen/generators/responsive-prompt.ts` — responsive Prompt
- `src/phases/prompt-gen/generators/interactions-prompt.ts` — interactions Prompt
- `src/llm/prompts/v1/generators/prompt.ts` — 추가 메타 프롬프트
- `tests/phases/prompt-gen/generators/` — 각 generator 테스트

**의존 태스크**: M0-10, M0-11, M2-07, M2-08

**완료 기준**:
- 컴포넌트 Prompt에 각 컴포넌트의 디자인 스펙(variants, states, 토큰 값)이 구체적으로 포함
- 페이지 Prompt에 섹션 구성, 사용 컴포넌트, 레이아웃 패턴이 포함
- 모든 Prompt에서 "적절하게 스타일링" 같은 모호한 표현 없이 구체적 값/패턴 지시
- 에센스가 반영된 톤/무드 맥락 포함 ("왜 이렇게 하는지")

---

### M2-11: README Generator + Prompt Writer

**설명**: prompts/README.md 사용 가이드를 생성하고, 모든 Prompt를 파일 시스템에 출력하는 writer를 구현한다.

**생성/수정 파일**:
- `src/phases/prompt-gen/generators/readme-gen.ts` — prompts/README.md 생성
  - 사용 방법, 단계 순서, 각 단계 요약, 주의 사항
- `src/phases/prompt-gen/writer.ts` — `writePrompts()` 함수
  - `prompts/` 디렉토리 생성
  - 각 `PromptStep`을 마크다운 파일로 출력 (step-01-project-setup.md 등)
  - README.md 출력
- `tests/phases/prompt-gen/writer.test.ts`

**의존 태스크**: M2-07

**완료 기준**:
- README.md에 전체 단계 목록, 사용법, 선행 관계가 포함
- `prompts/` 디렉토리에 모든 Step 파일 + README.md 저장
- 파일명이 `step-{번호}-{slug}.md` 형식

---

### M2-12: Phase 4 통합 — Prompt Generation 완성

**설명**: Step Planner + Context Injector + 모든 Generator + Writer를 조합하여 Phase 4 진입점을 완성한다.

**생성/수정 파일**:
- `src/phases/prompt-gen/index.ts` — `runPromptGeneration()` 함수 (stub 제거, 실제 구현)
  - Step Planner → Context Injector → Generator → Writer
  - `PromptSet` 반환
- `tests/phases/prompt-gen/index.test.ts` — Phase 4 통합 테스트

**의존 태스크**: M2-07, M2-08, M2-09, M2-10, M2-11

**완료 기준**:
- `AnalysisResult` + `DocumentSet` 입력 → `prompts/` 디렉토리에 4~12개 Step Prompt + README.md 생성
- 각 Prompt가 자기 완결적 (필요한 디자인 정보 인라인 포함)
- 소규모/대규모 프로젝트에 따라 Step 수가 적절히 조정

---

### M2-13: `--docs-only`, `--prompts-only` 옵션 완성

**설명**: 부분 실행 옵션을 완전히 구현한다. `--docs-only`는 Phase 1~3만, `--prompts-only`는 기존 analysis.json + design-spec 기반 Phase 4만 실행한다.

**생성/수정 파일**:
- `src/pipeline/orchestrator.ts` — `--docs-only`, `--prompts-only` 분기 로직 완성
  - `--prompts-only`: 기존 `analysis.json` 로드, 기존 `design-spec/` 문서 로드 → Phase 4 실행
  - `--docs-only`: Phase 1~3 실행, Phase 4 스킵
- `src/pipeline/cache-loader.ts` — 기존 analysis.json / design-spec 로드
- `tests/e2e/partial-run.test.ts`

**의존 태스크**: M2-06, M2-12

**완료 기준**:
- `--docs-only` 시 prompts/ 미생성, design-spec/만 생성
- `--prompts-only` 시 기존 analysis.json 로드 → prompts/ 재생성
- `--prompts-only` 시 기존 분석 결과 없으면 명확한 에러 메시지
- 사용자가 design-spec 문서를 수동 수정 후 `--prompts-only`로 Prompt 재생성하는 워크플로우 동작

---

### M2-14: Phase 3 + 4 파이프라인 연결 및 E2E 테스트

**설명**: Phase 3, 4를 오케스트레이터에 연결하고, 전체 파이프라인(Phase 1~4) E2E 테스트를 수행한다.

**생성/수정 파일**:
- `src/pipeline/orchestrator.ts` — Phase 3, 4에서 stub → 실제 구현 호출
- `tests/e2e/m2-full-pipeline.test.ts` — 전체 파이프라인 E2E 테스트

**의존 태스크**: M2-06, M2-12, M2-13

**완료 기준**:
- `ditto analyze ./test-repo` 실행 시 4 Phase 전체가 실제로 동작
- `ditto-output/<name>/` 하위에 `analysis.json` + `design-spec/` + `prompts/` 생성
- 생성된 문서가 마크다운으로 유효하고 읽기 가능
- 생성된 Prompt가 AI Agent에게 전달 가능한 수준

---

## M3: Polish & Publish — 안정화 및 배포

에러 처리 강화, CLI UX 개선, 다양한 레포 테스트, npm 배포.

---

### M3-01: 에러 처리 강화

**설명**: 엣지 케이스에 대한 에러 처리를 강화한다. Graceful degradation, 사용자 친화적 에러 메시지, 상세한 hint 제공을 포함한다.

**생성/수정 파일**:
- `src/cli/errors.ts` — 에러 메시지 가이드 (`02-cli-design.md` 9절) 전체 구현
- `src/types/errors.ts` — 에러 코드 체계 도입 (REPO_NOT_FOUND, API_KEY_INVALID 등)
- `src/pipeline/orchestrator.ts` — Phase별 에러 복구 전략 강화
- `src/phases/analysis/index.ts` — 개별 Analyzer Partial Failure 처리 고도화
- 전체 소스 — try/catch 누락 지점 보완

**의존 태스크**: M2-14

**완료 기준**:
- 모든 에러 메시지가 "원인 + 해결 방법" 포맷
- 잘못된 경로, 접근 불가 URL, API 키 오류, rate limit 각각 다른 메시지
- 개별 Analyzer 실패 시 나머지로 Partial 결과 생성 + 경고
- 알 수 없는 에러 시 이슈 등록 안내 포함

---

### M3-02: CLI UX 개선 — 진행 상태 표시

**설명**: 실행 중 진행 상태 표시를 개선한다. Phase별 스피너, 분석기별 진행률, 최종 요약(산출물 수, LLM 사용량)을 포함한다.

**생성/수정 파일**:
- `src/cli/formatter.ts` — `printHeader()`, `printSummary()` 고도화
  - 분석 완료 후 산출물 요약 (문서 N개, Prompt N개)
  - LLM 사용량 요약 (토큰 수, 추정 비용)
- `src/utils/progress.ts` — Phase/Task 스피너 개선
- `src/pipeline/orchestrator.ts` — 각 Phase/Task에 진행 상태 콜백 연결

**의존 태스크**: M2-14

**완료 기준**:
- `02-cli-design.md` 8절의 진행 표시 형식과 일치
- 각 Phase 시작/완료, 소요 시간 표시
- Health Check 결과(pass/warn/fail) 시각적 표시
- 최종 요약에 산출물 경로, 문서/Prompt 수, 토큰 사용량 포함

---

### M3-03: analysis.json 캐싱 및 재사용

**설명**: `analysis.json`에 캐시 메타데이터(파일 해시, 프롬프트 버전, 모델 정보)를 포함하여, 재분석 시 변경 감지 및 캐시 재사용이 가능하도록 한다.

**생성/수정 파일**:
- `src/pipeline/cache-loader.ts` — 캐시 유효성 검증 로직 강화
  - 파일 해시(SHA-256) 비교
  - 프롬프트 버전 비교
  - 모델 버전 비교
- `src/phases/extraction/index.ts` — 파일 해시 계산 추가
- `src/types/analysis.ts` — `AnalysisMeta`에 캐시 관련 필드 추가

**의존 태스크**: M2-13

**완료 기준**:
- `analysis.json`에 파일 해시, 프롬프트 버전, 모델 정보 포함
- 동일 레포 재분석 시 해시 비교로 변경 감지
- 변경 없으면 Phase 2 스킵 가능 (사용자에게 안내)

---

### M3-04: 다양한 레포 테스트 (5개+)

**설명**: 다양한 스타일/스택의 실제 공개 FE 레포에서 전체 파이프라인을 실행하고 품질을 검증한다.

**수행 내용**:
- 테스트 대상 레포 5개 이상 선정:
  1. Tailwind CSS + Next.js (SaaS 랜딩)
  2. CSS Modules + React + Vite (대시보드)
  3. Styled Components + Next.js (e-commerce)
  4. Tailwind + shadcn/ui (문서 사이트)
  5. 미니멀 CSS + Astro/기타 (블로그/포트폴리오)
- 각 레포에서 전체 파이프라인 실행
- 산출물 품질 수동 검증 및 프롬프트 튜닝

**생성/수정 파일**:
- `tests/benchmark/` — 벤치마크 스크립트 및 결과 기록
- `src/llm/prompts/v1/` — 프롬프트 튜닝 반영

**의존 태스크**: M3-01, M3-02

**완료 기준**:
- 5개 이상 레포에서 전체 파이프라인 정상 완료
- 각 레포의 산출물이 합리적 품질 (수동 검증)
- tier1(Tailwind) 프로젝트에서 높은 품질, tier2/3 프로젝트에서 허용 가능한 품질
- 실패 케이스에 대한 에러 메시지가 사용자 친화적

---

### M3-05: Prompt 품질 검증 — AI Agent 실행 테스트

**설명**: 생성된 Prompt를 실제 AI Coding Agent(Claude Code 등)에 전달하여 프로젝트 구현이 가능한지 검증한다.

**수행 내용**:
- 2~3개 레포의 생성된 Prompt를 AI Agent에 순차 전달
- 생성된 코드가 레퍼런스의 디자인 스타일을 반영하는지 검증
- Prompt의 구체성, 자기 완결성, 단계 간 연속성 평가
- 발견된 문제점에 따라 Prompt 생성 로직/프롬프트 튜닝

**생성/수정 파일**:
- `src/llm/prompts/v1/generators/prompt.ts` — 튜닝 반영
- `src/phases/prompt-gen/context-injector.ts` — 필요 시 컨텍스트 보강

**의존 태스크**: M3-04

**완료 기준**:
- 최소 2개 레포에서 생성된 Prompt로 기본적인 프로젝트 구현 성공
- 디자인 토큰, 컴포넌트 스타일이 레퍼런스와 유사한 톤/무드
- 각 Step 간 자연스러운 연속성 (이전 Step 결과물 위에 빌드)

---

### M3-06: npm 배포 준비

**설명**: npm 배포를 위한 패키지 설정, README, CHANGELOG, LICENSE를 준비한다.

**생성/수정 파일**:
- `package.json` — `name`, `version`, `description`, `keywords`, `repository`, `license`, `files`, `exports` 설정 완성
- `README.md` — 사용법, 설치 방법, 옵션 설명, 예시
- `CHANGELOG.md` — v0.1.0 초기 릴리스 내용
- `LICENSE` — MIT 라이선스
- `.npmignore` — 불필요 파일 제외 (tests, docs, fixtures 등)
- `tsdown.config.ts` — 프로덕션 빌드 최적화

**의존 태스크**: M3-04

**완료 기준**:
- `pnpm run build` → 깨끗한 프로덕션 빌드
- `pnpm pack`으로 패키지 크기 확인 (불필요 파일 미포함)
- README에 빠른 시작 가이드, 전체 옵션, 사용 예시 포함
- `exports` 필드로 CJS/ESM 듀얼 진입점 올바르게 설정

---

### M3-07: npm 배포 및 npx 테스트

**설명**: npm에 패키지를 배포하고, `npx ditto analyze <source>` 동작을 확인한다.

**수행 내용**:
- `npm publish` 실행
- `npx ditto analyze <local-repo>` 테스트
- `npx ditto analyze <github-url>` 테스트 (bin alias 동작 확인)
- 다른 머신/환경에서 설치 후 동작 확인

**의존 태스크**: M3-06

**완료 기준**:
- `npm install -g ditto` 정상 설치
- `ditto analyze ./repo` 전체 파이프라인 정상 동작
- `ditto --version`, `ditto --help` 정상 출력
- `npx ditto analyze <source>` 동작
- Node.js >= 20 미만에서 명확한 에러 메시지

---

### M3-08: CI/CD 파이프라인 설정

**설명**: GitHub Actions 기반 CI/CD를 설정한다. 린팅, 테스트, 빌드, 자동 배포를 포함한다.

**생성/수정 파일**:
- `.github/workflows/ci.yml` — PR/push 시 lint + test + build
- `.github/workflows/release.yml` — tag push 시 npm 자동 배포
- `.github/workflows/benchmark.yml` — (선택) 주기적 벤치마크 실행

**의존 태스크**: M3-07

**완료 기준**:
- PR 생성 시 자동으로 lint, test, build 실행
- 모든 체크 통과 시 merge 가능
- 버전 태그 push 시 npm 자동 배포
- 테스트 실패 시 PR에 결과 표시

---

## 의존성 그래프 (Dependency Graph)

```
M0: Foundation
═══════════════════════════════════════════════════════════
M0-01 ─────┬──▶ M0-02 ──┬──▶ M0-03 ──┬──▶ M0-04 ──▶ M0-05 ──▶ M0-06
           │             │            │                           │
           │             │            └──▶ M0-07 ──▶ M0-10       │
           │             │                  │        │            │
           │             │                  │        └──▶ M0-11   │
           │             │                  │                     │
           │             └──────────────────┴──▶ M0-08           │
           │                                      │              │
           │                                      └──────────────┘
           │                                             │
           │                                             ▼
           │                                      M0-09
           │                                             │
           │                                      ┌──────┘
           │                                      │  M0-10 ◀── M0-07
           │                                      │  M0-11 ◀── M0-07
           │                                      ▼
           └────────────────────────────────▶ M0-12


M1: Core Analysis
═══════════════════════════════════════════════════════════
M0-03 ──▶ M1-01 ──────────────────────────────────┐
M0-02 ──▶ M1-02 ──▶ M1-03 ──┬──▶ M1-04           │
M0-03 ──┘                    └──▶ M1-05 ──▶ M1-06 │
                                                   │
M1-06 ──▶ M1-07                                    │
                                                   │
M1-01 + M1-02~07 ──────────────▶ M1-08            │
                                                   │
M0-07 + M1-03 ──▶ M1-09                           │
                                                   │
M0-10 + M0-11 + M1-09 ──┬──▶ M1-10                │
                         ├──▶ M1-11                │
                         ├──▶ M1-12                │
                         └──▶ M1-13                │
                                                   │
M1-10~13 ──▶ M1-14                                 │
                                                   │
M1-08 + M1-10~14 ──▶ M1-15                        │
                                                   │
M1-08 + M1-15 ──▶ M1-16 ──▶ M1-17                 │


M2: Document & Prompt Generation
═══════════════════════════════════════════════════════════
M0-02 ──▶ M2-01 ──────────────────────────┐
                                           │
M0-10 + M0-11 + M2-01 ──┬──▶ M2-02       │
                         ├──▶ M2-03       │
                         └──▶ M2-04       │
                                           │
M2-01 ──▶ M2-05                           │
                                           │
M2-01~05 ──▶ M2-06                        │
                                           │
M0-02 ──▶ M2-07 ──▶ M2-08                │
                                           │
M0-10 + M0-11 + M2-07 + M2-08 ──┬──▶ M2-09
                                  └──▶ M2-10
                                           │
M2-07 ──▶ M2-11                           │
                                           │
M2-07~11 ──▶ M2-12                        │
                                           │
M2-06 + M2-12 ──▶ M2-13                   │
                                           │
M2-06 + M2-12 + M2-13 ──▶ M2-14           │


M3: Polish & Publish
═══════════════════════════════════════════════════════════
M2-14 ──┬──▶ M3-01 ──┐
        └──▶ M3-02 ──┤
                      └──▶ M3-04 ──▶ M3-05
M2-13 ──▶ M3-03           │
                           └──▶ M3-06 ──▶ M3-07 ──▶ M3-08
```

---

## 태스크 요약

| 마일스톤 | 태스크 수 | 핵심 산출물 |
|---------|----------|-----------|
| **M0: Foundation** | 12 | CLI 골격, LLM 클라이언트, 파이프라인 stub, Zod 스키마, 설정 시스템 |
| **M1: Core Analysis** | 17 | Phase 1 완성(Extraction), Phase 2 완성(Analysis), analysis.json |
| **M2: Doc & Prompt Gen** | 14 | Phase 3 완성(Documentation), Phase 4 완성(Prompt Gen), design-spec/, prompts/ |
| **M3: Polish & Publish** | 8 | 에러 처리 강화, CLI UX, 5개+ 레포 테스트, npm 배포 |
| **합계** | **51** | |

---

## 크리티컬 패스 (Critical Path)

전체 타임라인을 결정하는 가장 긴 의존 체인:

```
M0-01 → M0-02 → M0-03 → M0-07 → M0-10 → M1-10 → M1-14 → M1-15 → M1-16 → M2-06 → M2-14 → M3-04 → M3-07
```

이 경로의 병목은 **M1-10~M1-14 (분석기 구현)** 구간과 **M2-02~M2-04 (문서 생성기 구현)** 구간이다. 분석기 간 독립성이 높으므로 M1-10~M1-13은 병렬 진행이 가능하며, 문서 생성기도 마찬가지다.
