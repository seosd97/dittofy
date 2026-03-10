# 02. CLI Design — 명령어 인터페이스 설계

## 1. 명령어 구조 개요

```
ditto
├── analyze <source>       # 핵심 분석 명령어
├── config                 # 설정 관리
│   ├── set <key> <value>
│   ├── get <key>
│   ├── list
│   └── reset [key]
├── --version              # 버전 출력
└── --help                 # 도움말 출력
```

---

## 2. 메인 커맨드 정의

### citty 루트 커맨드 구현

```typescript
// src/cli/index.ts
import { defineCommand, runMain } from "citty"

const main = defineCommand({
  meta: {
    name: "ditto",
    version: "0.1.0",
    description:
      "Ditto — 디자인 레퍼런스를 분석하여 디자인 스펙 문서와 AI Coding Agent용 Prompt를 생성합니다.",
  },
  subCommands: {
    analyze: () => import("./commands/analyze").then((m) => m.default),
    config: () => import("./commands/config").then((m) => m.default),
  },
})

runMain(main)
```

---

## 3. `ditto analyze` — 핵심 분석 명령어

### 3.1 기본 사용법

```
ditto analyze <source>
```

`<source>`는 분석 대상 레퍼런스를 지정한다.
- 로컬 디렉토리 경로: `./path/to/repo`, `/absolute/path/to/repo`
- GitHub URL: `https://github.com/user/repo`

### 3.2 옵션 상세 스펙

| 옵션 | 축약 | 타입 | 기본값 | 설명 |
|------|------|------|--------|------|
| `--output` | `-o` | `string` | `"./ditto-output"` | 산출물 출력 디렉토리 경로 |
| `--package` | `-p` | `string` | `undefined` | Monorepo 내 분석 대상 패키지 경로 |
| `--stack` | `-s` | `string` | `"auto"` | 타겟 구현 스택 지정 |
| `--model` | `-m` | `string` | `"gpt-5.2"` | 사용할 LLM 모델 |
| `--language` | `-l` | `string` | `"ko"` | 산출물 언어 |
| `--docs-only` | | `boolean` | `false` | 디자인 스펙 문서만 생성 (Prompt 생성 건너뜀) |
| `--prompts-only` | | `boolean` | `false` | 기존 분석 결과로 Prompt만 재생성 |

### 3.3 각 옵션 상세

#### `--output` / `-o`

산출물이 저장될 디렉토리를 지정한다.

- **타입**: `string`
- **기본값**: `"./ditto-output"`
- **유효성 검증**: 상위 디렉토리가 존재해야 함. 존재하지 않으면 에러.
- **동작**: `<output>/<project-name>/` 하위에 `design-spec/`, `prompts/` 생성
- **예시**:
  ```bash
  ditto analyze ./my-repo --output ./results
  # → ./results/my-repo/design-spec/
  # → ./results/my-repo/prompts/
  ```

#### `--package` / `-p`

Monorepo 환경에서 분석 대상 패키지를 지정한다.

- **타입**: `string`
- **기본값**: `undefined` (미지정 시 루트 또는 자동 감지)
- **유효성 검증**: 지정된 경로가 소스 내에 존재해야 함
- **동작**: 미지정 시 `package.json`의 `workspaces` 필드를 확인하여 FE 패키지를 자동 감지 시도. 다수 발견 시 consola 프롬프트로 선택 요청.
- **예시**:
  ```bash
  ditto analyze ./monorepo --package apps/web
  ditto analyze https://github.com/user/monorepo --package packages/ui
  ```

#### `--stack` / `-s`

생성될 Prompt의 타겟 구현 스택을 지정한다.

- **타입**: `string`
- **기본값**: `"auto"`
- **허용값**: `"auto"`, `"nextjs"`, `"react-vite"`, `"astro"`, `"svelte"`
- **유효성 검증**: 허용값 목록에 포함되어야 함
- **동작**:
  - `auto`: 레퍼런스의 기술 스택을 감지하여 자동 결정 (감지 불가 시 `react-vite`)
  - 명시적 지정 시: 해당 스택으로 Prompt 생성
- **예시**:
  ```bash
  ditto analyze ./my-repo --stack nextjs
  ditto analyze ./my-repo --stack react-vite
  ```

#### `--model` / `-m`

분석에 사용할 LLM 모델을 지정한다.

- **타입**: `string`
- **기본값**: `"gpt-5.2"`
- **허용값**: `"gpt-5.2"`, `"gpt-4o"`, `"claude-sonnet"`, `"claude-haiku"`
- **유효성 검증**: 허용값 목록에 포함되어야 함. 해당 모델의 API 키가 설정되어 있어야 함.
- **예시**:
  ```bash
  ditto analyze ./my-repo --model claude-sonnet
  ```

#### `--language` / `-l`

산출물(디자인 스펙 문서, Prompt)의 언어를 지정한다.

- **타입**: `string`
- **기본값**: `"ko"`
- **허용값**: `"ko"`, `"en"`
- **유효성 검증**: 허용값 목록에 포함되어야 함
- **예시**:
  ```bash
  ditto analyze ./my-repo --language en
  ```

#### `--docs-only`

Phase 3(Documentation)까지만 실행하고 Phase 4(Prompt Generation)를 건너뛴다.

- **타입**: `boolean`
- **기본값**: `false`
- **`--prompts-only`와 동시 사용 불가**: 둘 다 지정 시 에러
- **예시**:
  ```bash
  ditto analyze ./my-repo --docs-only
  ```

#### `--prompts-only`

기존 분석 결과(`analysis.json` + `design-spec/`)를 기반으로 Phase 4(Prompt Generation)만 실행한다. 사용자가 디자인 스펙 문서를 수동 수정한 뒤 Prompt만 재생성할 때 사용한다.

- **타입**: `boolean`
- **기본값**: `false`
- **유효성 검증**: `--output` 경로에 기존 분석 결과가 존재해야 함
- **`--docs-only`와 동시 사용 불가**: 둘 다 지정 시 에러
- **예시**:
  ```bash
  # 1차: 전체 분석
  ditto analyze ./my-repo

  # 사용자가 design-spec 문서를 수동 수정 후
  # 2차: Prompt만 재생성
  ditto analyze ./my-repo --prompts-only
  ```

### 3.4 citty 명령어 구현

```typescript
// src/cli/commands/analyze.ts
import { defineCommand } from "citty"

export default defineCommand({
  meta: {
    name: "analyze",
    description: "디자인 레퍼런스를 분석하여 디자인 스펙 문서와 Prompt를 생성합니다.",
  },
  args: {
    source: {
      type: "positional",
      description: "분석 대상 (로컬 경로 또는 GitHub URL)",
      required: true,
    },
    output: {
      type: "string",
      alias: "o",
      description: "산출물 출력 디렉토리",
      default: "./ditto-output",
    },
    package: {
      type: "string",
      alias: "p",
      description: "Monorepo 내 분석 대상 패키지 경로",
    },
    stack: {
      type: "string",
      alias: "s",
      description: "타겟 구현 스택",
      default: "auto",
    },
    model: {
      type: "string",
      alias: "m",
      description: "사용할 LLM 모델",
      default: "gpt-5.2",
    },
    language: {
      type: "string",
      alias: "l",
      description: "산출물 언어 (ko, en)",
      default: "ko",
    },
    "docs-only": {
      type: "boolean",
      description: "디자인 스펙 문서만 생성",
      default: false,
    },
    "prompts-only": {
      type: "boolean",
      description: "기존 분석 결과로 Prompt만 재생성",
      default: false,
    },
  },
  async run({ args }) {
    // 옵션 유효성 검증
    if (args["docs-only"] && args["prompts-only"]) {
      throw new Error("--docs-only와 --prompts-only는 동시에 사용할 수 없습니다.")
    }

    const validStacks = ["auto", "nextjs", "react-vite", "astro", "svelte"]
    if (!validStacks.includes(args.stack)) {
      throw new Error(
        `지원하지 않는 스택입니다: ${args.stack}\n허용값: ${validStacks.join(", ")}`,
      )
    }

    const validModels = ["gpt-5.2", "gpt-4o", "claude-sonnet", "claude-haiku"]
    if (!validModels.includes(args.model)) {
      throw new Error(
        `지원하지 않는 모델입니다: ${args.model}\n허용값: ${validModels.join(", ")}`,
      )
    }

    const validLanguages = ["ko", "en"]
    if (!validLanguages.includes(args.language)) {
      throw new Error(
        `지원하지 않는 언어입니다: ${args.language}\n허용값: ${validLanguages.join(", ")}`,
      )
    }

    // 파이프라인 실행
    // → orchestrator로 위임
  },
})
```

---

## 4. `ditto config` — 설정 관리 명령어

### 4.1 서브커맨드

| 서브커맨드 | 설명 | 예시 |
|-----------|------|------|
| `set <key> <value>` | 설정 값 저장 | `ditto config set model claude-sonnet` |
| `get <key>` | 설정 값 조회 | `ditto config get model` |
| `list` | 전체 설정 목록 출력 | `ditto config list` |
| `reset [key]` | 설정 초기화 (키 지정 시 해당 키만, 미지정 시 전체) | `ditto config reset model` |

### 4.2 설정 가능한 키

| 키 | 설명 | 예시 값 |
|----|------|---------|
| `model` | 기본 LLM 모델 | `"gpt-5.2"` |
| `language` | 기본 산출물 언어 | `"ko"` |
| `stack` | 기본 타겟 스택 | `"auto"` |
| `output` | 기본 출력 경로 | `"./ditto-output"` |
| `openaiApiKey` | OpenAI API 키 | `"sk-..."` |
| `anthropicApiKey` | Anthropic API 키 | `"sk-ant-..."` |

### 4.3 citty 명령어 구현

```typescript
// src/cli/commands/config.ts
import { defineCommand } from "citty"

export default defineCommand({
  meta: {
    name: "config",
    description: "Ditto 설정을 관리합니다.",
  },
  subCommands: {
    set: defineCommand({
      meta: { name: "set", description: "설정 값을 저장합니다." },
      args: {
        key: { type: "positional", description: "설정 키", required: true },
        value: { type: "positional", description: "설정 값", required: true },
      },
      async run({ args }) {
        // 글로벌 설정 파일에 저장
      },
    }),
    get: defineCommand({
      meta: { name: "get", description: "설정 값을 조회합니다." },
      args: {
        key: { type: "positional", description: "설정 키", required: true },
      },
      async run({ args }) {
        // 설정 값 출력 (병합된 최종값 + 출처 표시)
      },
    }),
    list: defineCommand({
      meta: { name: "list", description: "전체 설정을 출력합니다." },
      async run() {
        // 전체 설정 테이블 출력 (값 + 출처)
      },
    }),
    reset: defineCommand({
      meta: { name: "reset", description: "설정을 초기화합니다." },
      args: {
        key: {
          type: "positional",
          description: "초기화할 설정 키 (미지정 시 전체)",
        },
      },
      async run({ args }) {
        // 설정 초기화
      },
    }),
  },
})
```

---

## 5. 설정 우선순위

c12 기반 설정 시스템으로, 다음 우선순위에 따라 설정이 병합된다 (위가 높음):

```
1. CLI 옵션          ditto analyze ./repo --model claude-sonnet
2. 환경 변수          DITTO_MODEL=claude-sonnet
3. 프로젝트 설정       ./ditto.config.ts (현재 디렉토리)
4. 글로벌 설정        ~/.config/ditto/config.json
5. 기본값            코드에 정의된 defaults
```

### 병합 규칙
- 상위 우선순위 값이 존재하면 하위를 **완전히 덮어씀** (deep merge 없음)
- API 키는 설정 파일에 저장 가능하나, 환경 변수 사용을 권장

### c12 설정 로딩 구현

```typescript
// src/config/loader.ts
import { loadConfig } from "c12"

export interface DittoConfig {
  model: string
  language: string
  stack: string
  output: string
  openaiApiKey?: string
  anthropicApiKey?: string
}

const defaults: DittoConfig = {
  model: "gpt-5.2",
  language: "ko",
  stack: "auto",
  output: "./ditto-output",
}

export async function loadDittoConfig(overrides?: Partial<DittoConfig>) {
  const { config } = await loadConfig<DittoConfig>({
    name: "ditto",
    defaults,
    globalRc: true,        // ~/.config/ditto 참조
    envName: "DITTO",         // DITTO_ 접두사 환경변수 자동 매핑
    overrides,              // CLI 옵션에서 전달받은 값
  })

  return config
}
```

---

## 6. 설정 파일 스키마

### 6.1 프로젝트 설정 — `ditto.config.ts`

프로젝트 루트에 위치하며, 해당 프로젝트에 대한 분석 설정을 정의한다. c12가 TypeScript 파일을 네이티브로 지원한다.

```typescript
// ditto.config.ts
import { defineConfig } from "ditto"

export default defineConfig({
  model: "claude-sonnet",
  language: "ko",
  stack: "nextjs",
  output: "./analysis-output",
})
```

`defineConfig` 헬퍼 함수를 제공하여 타입 힌트를 지원한다:

```typescript
// src/config/define.ts
import type { DittoConfig } from "./loader"

export function defineConfig(config: Partial<DittoConfig>): Partial<DittoConfig> {
  return config
}
```

### 6.2 프로젝트 설정 — `.dittorc.json` (대안)

TypeScript 설정이 부담스러운 경우 JSON 포맷도 지원한다.

```json
{
  "model": "claude-sonnet",
  "language": "ko",
  "stack": "nextjs",
  "output": "./analysis-output"
}
```

### 6.3 글로벌 설정 — `~/.config/ditto/config.json`

`ditto config set`으로 저장되는 전역 설정 파일이다. 주로 API 키와 사용자 기본 선호를 저장한다.

```json
{
  "model": "gpt-5.2",
  "language": "ko",
  "openaiApiKey": "sk-...",
  "anthropicApiKey": "sk-ant-..."
}
```

### 6.4 c12가 탐색하는 파일 목록 (자동)

c12의 `name: "ditto"` 설정에 의해 다음 파일들을 자동으로 탐색한다:

- `ditto.config.ts` / `ditto.config.js` / `ditto.config.mjs`
- `.dittorc` / `.dittorc.json` / `.dittorc.yaml`
- `package.json`의 `"ditto"` 필드

---

## 7. API 키 관리

### 7.1 지원하는 API 키

| 환경 변수 | 설정 키 | 대상 프로바이더 |
|----------|---------|---------------|
| `DITTO_OPENAI_API_KEY` | `openaiApiKey` | OpenAI (GPT-5.2, GPT-4o) |
| `DITTO_ANTHROPIC_API_KEY` | `anthropicApiKey` | Anthropic (Claude Sonnet, Haiku) |

### 7.2 API 키 해석 우선순위

```
1. 환경 변수              DITTO_OPENAI_API_KEY
2. 프로바이더 환경 변수     OPENAI_API_KEY (fallback)
3. 프로젝트 설정 파일       ditto.config.ts의 openaiApiKey
4. 글로벌 설정 파일        ~/.config/ditto/config.json의 openaiApiKey
5. 대화형 프롬프트         consola로 사용자에게 직접 입력 요청
```

> **보안 참고**: 설정 파일에 API 키를 저장할 경우 `.gitignore`에 해당 파일을 추가하도록 안내한다.

### 7.3 API 키 해석 구현

```typescript
// src/config/api-keys.ts
import consola from "consola"

interface ResolvedApiKey {
  value: string
  source: string
}

export async function resolveApiKey(
  provider: "openai" | "anthropic",
  config: DittoConfig,
): Promise<ResolvedApiKey> {
  const envPrefix = "DITTO"
  const envKey = `${envPrefix}_${provider.toUpperCase()}_API_KEY`
  const fallbackEnvKey = `${provider.toUpperCase()}_API_KEY`
  const configKey = `${provider}ApiKey` as keyof DittoConfig

  // 1. Ditto 전용 환경 변수
  if (process.env[envKey]) {
    return { value: process.env[envKey]!, source: `env:${envKey}` }
  }

  // 2. 프로바이더 기본 환경 변수 (fallback)
  if (process.env[fallbackEnvKey]) {
    return { value: process.env[fallbackEnvKey]!, source: `env:${fallbackEnvKey}` }
  }

  // 3. 설정 파일 (c12가 프로젝트 + 글로벌 병합 완료)
  const configValue = config[configKey]
  if (typeof configValue === "string" && configValue) {
    return { value: configValue, source: "config" }
  }

  // 4. 대화형 프롬프트
  const input = await consola.prompt(
    `${provider} API 키를 입력하세요 (저장하려면 ditto config set 사용):`,
    { type: "text" },
  )

  if (!input || typeof input !== "string") {
    throw new Error(
      `${provider} API 키가 필요합니다.\n` +
        `설정 방법:\n` +
        `  환경 변수: export ${envKey}=your-key\n` +
        `  설정 저장: ditto config set ${configKey} your-key`,
    )
  }

  return { value: input, source: "prompt" }
}
```

---

## 8. 진행 상태 표시 설계

### 8.1 Phase별 진행 표시

Ditto의 4-Phase 파이프라인 각 단계에서 consola를 활용하여 진행 상태를 표시한다.

```
$ ditto analyze ./my-awesome-site

  Ditto v0.1.0

  ◼ Source    ./my-awesome-site
  ◼ Model    gpt-5.2
  ◼ Stack    auto
  ◼ Output   ./ditto-output/my-awesome-site

─────────────────────────────────────────

  Phase 1/4 — Extraction
  ℹ 레포 구조 스캔 중...
  ℹ 파일 148개 탐지, FE 관련 파일 62개 필터링
  ℹ 코드 추출 완료
  ℹ 기술 스택 감지: Next.js, Tailwind CSS, TypeScript
  ✔ Extraction 완료 (4.2s)

  Phase 2/4 — Analysis
  ℹ Health Check: pass ✔
  ℹ 디자인 토큰 분석 중... (LLM 호출 1/6)
  ℹ 컴포넌트 패턴 분석 중... (LLM 호출 2/6)
  ℹ 레이아웃 시스템 분석 중... (LLM 호출 3/6)
  ℹ 페이지 구성 분석 중... (LLM 호출 4/6)
  ℹ 반응형 전략 분석 중... (LLM 호출 5/6)
  ℹ 에센스 종합 중... (LLM 호출 6/6)
  ✔ Analysis 완료 (47.3s)

  Phase 3/4 — Documentation
  ℹ 디자인 스펙 문서 생성 중...
  ℹ 문서 6개 생성 완료
  ✔ Documentation 완료 (18.7s)

  Phase 4/4 — Prompt Generation
  ℹ 단계 계획 수립 중... → 7 steps
  ℹ Prompt 생성 중... (1/7) Project Setup
  ℹ Prompt 생성 중... (2/7) Design System
  ℹ Prompt 생성 중... (3/7) Base Components
  ℹ Prompt 생성 중... (4/7) Layout Components
  ℹ Prompt 생성 중... (5/7) Composite Components
  ℹ Prompt 생성 중... (6/7) Page Implementation
  ℹ Prompt 생성 중... (7/7) Responsive
  ✔ Prompt Generation 완료 (32.1s)

─────────────────────────────────────────

  ✔ 분석 완료! (1m 42s)

  산출물:
    design-spec/  6개 문서
    prompts/      7개 Prompt + README.md

  → ./ditto-output/my-awesome-site/
```

### 8.2 consola 활용 구현

```typescript
// src/cli/progress.ts
import consola from "consola"

export function printHeader(options: {
  source: string
  model: string
  stack: string
  output: string
}) {
  consola.log("")
  consola.log("  Ditto v0.1.0")
  consola.log("")
  consola.log(`  ◼ Source    ${options.source}`)
  consola.log(`  ◼ Model    ${options.model}`)
  consola.log(`  ◼ Stack    ${options.stack}`)
  consola.log(`  ◼ Output   ${options.output}`)
  consola.log("")
}

export function phaseStart(phase: number, total: number, name: string) {
  consola.log(`  Phase ${phase}/${total} — ${name}`)
}

export function phaseStep(message: string) {
  consola.info(message)
}

export function phaseComplete(name: string, durationMs: number) {
  const seconds = (durationMs / 1000).toFixed(1)
  consola.success(`${name} 완료 (${seconds}s)`)
  consola.log("")
}

export function printSummary(options: {
  totalMs: number
  docCount: number
  promptCount: number
  outputDir: string
}) {
  const duration = formatDuration(options.totalMs)
  consola.log("")
  consola.success(`분석 완료! (${duration})`)
  consola.log("")
  consola.log(`  산출물:`)
  consola.log(`    design-spec/  ${options.docCount}개 문서`)
  consola.log(`    prompts/      ${options.promptCount}개 Prompt + README.md`)
  consola.log("")
  consola.log(`  → ${options.outputDir}`)
  consola.log("")
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}
```

### 8.3 Health Check 결과 표시

Phase 1 완료 후, Phase 2 진입 전 Health Check 결과를 표시한다.

```
  # pass인 경우
  ℹ Health Check: pass ✔

  # warn인 경우
  ⚠ Health Check: warn
    - 컴포넌트 파일이 5개 미만입니다. 분석 품질이 제한될 수 있습니다.
    - CSS 변수가 감지되지 않았습니다. 토큰 분석이 제한될 수 있습니다.

  # fail인 경우
  ✖ Health Check: fail
    - 스타일링 관련 파일이 발견되지 않았습니다.
    - FE 프로젝트가 아닌 것으로 판단됩니다.
    분석을 중단합니다.
```

---

## 9. 에러 메시지 가이드

### 9.1 에러 메시지 형식

모든 에러 메시지는 다음 형식을 따른다:

```
✖ [에러 요약]

  원인: [구체적 원인 설명]

  해결 방법:
    [실행 가능한 해결 단계]
```

### 9.2 에러 유형별 메시지

#### 소스 관련 에러

```
✖ 분석 대상을 찾을 수 없습니다.

  원인: 지정된 경로가 존재하지 않습니다: ./nonexistent-repo

  해결 방법:
    1. 경로가 올바른지 확인하세요.
    2. 상대 경로는 현재 디렉토리 기준입니다: /Users/you/projects
```

```
✖ GitHub 레포를 다운로드할 수 없습니다.

  원인: https://github.com/user/private-repo에 접근할 수 없습니다 (404).

  해결 방법:
    1. URL이 올바른지 확인하세요.
    2. 비공개 레포라면 GITHUB_TOKEN 환경 변수를 설정하세요.
       export GITHUB_TOKEN=ghp_...
```

#### API 키 관련 에러

```
✖ OpenAI API 키가 설정되지 않았습니다.

  원인: 모델 gpt-5.2을(를) 사용하려면 OpenAI API 키가 필요합니다.

  해결 방법:
    1. 환경 변수로 설정: export DITTO_OPENAI_API_KEY=sk-...
    2. 설정에 저장: ditto config set openaiApiKey sk-...
    3. 다른 프로바이더 모델 사용: ditto analyze ... --model claude-sonnet
```

```
✖ API 인증에 실패했습니다.

  원인: 제공된 OpenAI API 키가 유효하지 않습니다.

  해결 방법:
    1. API 키가 올바른지 확인하세요.
    2. API 키를 갱신하세요: https://platform.openai.com/api-keys
    3. 현재 설정 확인: ditto config get openaiApiKey
```

#### 옵션 관련 에러

```
✖ 잘못된 옵션 조합입니다.

  원인: --docs-only와 --prompts-only는 동시에 사용할 수 없습니다.

  해결 방법:
    - 문서만 생성: ditto analyze ./repo --docs-only
    - Prompt만 재생성: ditto analyze ./repo --prompts-only
```

```
✖ 기존 분석 결과를 찾을 수 없습니다.

  원인: --prompts-only 옵션은 기존 분석 결과가 필요합니다.
        ./ditto-output/my-repo/design-spec/ 디렉토리가 존재하지 않습니다.

  해결 방법:
    1. 먼저 전체 분석을 실행하세요: ditto analyze ./repo
    2. 또는 --output 경로를 확인하세요: ditto analyze ./repo --prompts-only --output ./other-dir
```

#### Monorepo 관련 에러

```
✖ Monorepo에서 분석 대상 패키지를 특정할 수 없습니다.

  원인: 여러 FE 패키지가 감지되었습니다:
    - apps/web
    - apps/admin
    - packages/ui

  해결 방법:
    --package 옵션으로 대상을 지정하세요:
    ditto analyze ./monorepo --package apps/web
```

### 9.3 에러 처리 구현

```typescript
// src/cli/errors.ts
import consola from "consola"

export class DittoError extends Error {
  constructor(
    message: string,
    public cause: string,
    public hints: string[],
  ) {
    super(message)
    this.name = "DittoError"
  }
}

export function handleError(error: unknown): never {
  if (error instanceof DittoError) {
    consola.error(error.message)
    consola.log("")
    consola.log(`  원인: ${error.cause}`)
    consola.log("")
    consola.log("  해결 방법:")
    for (const hint of error.hints) {
      consola.log(`    ${hint}`)
    }
    consola.log("")
  } else if (error instanceof Error) {
    consola.error(`예상하지 못한 오류가 발생했습니다: ${error.message}`)
    consola.log("")
    consola.log("  이 문제가 반복되면 이슈를 등록해주세요:")
    consola.log("    https://github.com/user/ditto/issues")
  } else {
    consola.error("알 수 없는 오류가 발생했습니다.")
  }

  process.exit(1)
}
```

---

## 10. 사용 예시

### 10.1 기본 사용 — 로컬 프로젝트 분석

```bash
# 로컬 FE 프로젝트 전체 분석
ditto analyze ./my-awesome-site
```

### 10.2 GitHub 레포 분석

```bash
# GitHub URL로 분석
ditto analyze https://github.com/shadcn-ui/taxonomy
```

### 10.3 Monorepo 내 특정 패키지 분석

```bash
# Monorepo에서 특정 패키지 지정
ditto analyze ./my-monorepo --package apps/web
```

### 10.4 모델과 언어 변경

```bash
# Claude Sonnet으로 영문 산출물 생성
ditto analyze ./my-repo --model claude-sonnet --language en
```

### 10.5 타겟 스택 지정

```bash
# 레퍼런스가 CRA이지만 Next.js로 구현하고 싶을 때
ditto analyze ./legacy-cra-app --stack nextjs
```

### 10.6 출력 경로 지정

```bash
# 산출물을 특정 디렉토리에 저장
ditto analyze ./my-repo --output ./docs/design-analysis
```

### 10.7 피드백 워크플로우 — 문서 수정 후 Prompt 재생성

```bash
# Step 1: 전체 분석 실행
ditto analyze ./my-repo

# Step 2: 생성된 디자인 스펙 문서를 검토하고 수동 수정
#   예: ditto-output/my-repo/design-spec/01-design-tokens.md 수정

# Step 3: 수정된 문서 기반으로 Prompt만 재생성
ditto analyze ./my-repo --prompts-only
```

### 10.8 문서만 생성 (Prompt 불필요)

```bash
# 디자인 스펙 문서만 필요한 경우
ditto analyze ./my-repo --docs-only
```

### 10.9 설정 관리

```bash
# 기본 모델 변경
ditto config set model claude-sonnet

# API 키 저장
ditto config set openaiApiKey sk-...

# 현재 설정 확인
ditto config list

# 특정 설정 확인
ditto config get model

# 설정 초기화
ditto config reset model

# 전체 설정 초기화
ditto config reset
```

### 10.10 환경 변수를 활용한 CI/스크립트 실행

```bash
# 환경 변수로 API 키 설정 후 실행
DITTO_OPENAI_API_KEY=sk-... ditto analyze ./my-repo

# 또는 .env 파일 활용 (dotenv 등)
export DITTO_OPENAI_API_KEY=sk-...
export DITTO_MODEL=claude-sonnet
ditto analyze ./my-repo
```

---

## 11. 환경 변수 매핑

c12의 `envName: "DITTO"` 설정에 의해 `DITTO_` 접두사 환경 변수가 설정 키로 자동 매핑된다.

| 환경 변수 | 매핑되는 설정 키 |
|----------|----------------|
| `DITTO_MODEL` | `model` |
| `DITTO_LANGUAGE` | `language` |
| `DITTO_STACK` | `stack` |
| `DITTO_OUTPUT` | `output` |
| `DITTO_OPENAI_API_KEY` | `openaiApiKey` |
| `DITTO_ANTHROPIC_API_KEY` | `anthropicApiKey` |

---

## 12. 종료 코드

| 코드 | 의미 |
|------|------|
| `0` | 정상 완료 |
| `1` | 일반 에러 (옵션 오류, API 오류, 분석 실패 등) |
| `2` | Health Check fail로 분석 중단 |
