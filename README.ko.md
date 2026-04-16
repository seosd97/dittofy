# Dittofy

[English](./README.md) | [한국어](./README.ko.md)

[![CI](https://github.com/seosd97/dittofy/actions/workflows/ci.yml/badge.svg)](https://github.com/seosd97/dittofy/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/seosd97/dittofy/graph/badge.svg)](https://codecov.io/gh/seosd97/dittofy)
[![npm version](https://img.shields.io/npm/v/dittofy)](https://www.npmjs.com/package/dittofy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

프론트엔드 레포를 분석해 재사용 가능한 디자인 에센스를 추출하고, AI 코딩 에이전트용 구현 프롬프트를 생성하는 CLI 도구입니다.

이 문서는 번역본이며, 기준 문서(source of truth)는 [README.md](./README.md)입니다.

## 무엇을 하는 도구인가

- FE 코드베이스를 스캔해 구조화된 `analysis.json`을 생성합니다.
- 분석 결과로 사람이 읽기 쉬운 디자인 스펙 문서를 생성합니다.
- 코딩 에이전트가 바로 사용할 수 있는 단계별 구현 프롬프트를 생성합니다.

Dittofy는 디자인 패턴과 의도를 추출하는 도구이며, 픽셀 단위 1:1 복제 도구는 아닙니다.

## 설치

```bash
npm install -g dittofy
```

명령어는 `ditto`, `dittofy` 둘 다 사용할 수 있습니다.

```bash
ditto --help
dittofy --help
```

글로벌 설치 없이 실행:

```bash
npx dittofy analyze ./my-app
```

## 요구 사항

- Node.js `>=22.0.0`

## 빠른 시작

```bash
# 1) 사용할 provider의 API 키 설정
export OPENAI_API_KEY=sk-...

# 2) 분석 + 문서/프롬프트 생성
ditto analyze ./my-react-app

# 3) 기존 분석 결과로 재생성 (LLM 호출 없음)
ditto generate --from ditto-output/my-react-app/analysis.json --target next-tailwind
```

## 산출물 구조

기본적으로 `analyze` 결과는 다음 경로에 생성됩니다.

```text
ditto-output/<project-name>/
```

일반적인 구조:

```text
ditto-output/
└── my-react-app/
    ├── analysis.json
    ├── analysis.md
    ├── design-spec/
    │   ├── 01-design-tokens.md
    │   ├── 02-typography.md
    │   ├── 03-component-catalog.md
    │   ├── 04-layout-system.md
    │   └── ...
    └── prompts/
        ├── README.md
        ├── step-01-setup.md
        ├── step-02-design-tokens.md
        └── ...
```

## CLI 레퍼런스

### `ditto analyze <source>`

로컬 경로 또는 GitHub URL을 분석합니다. `--dry-run`이 아니면 LLM 분석이 수행됩니다.

인자:

| 인자 | 필수 | 설명 |
| --- | --- | --- |
| `<source>` | 예 | 분석할 로컬 경로 또는 GitHub URL |

옵션:

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `-o, --output <dir>` | `ditto-output` | 출력 베이스 디렉토리. 최종 경로는 `<output>/<project-name>`. |
| `-m, --model <id>` | `gpt-5.4-mini` | 선택한 provider SDK로 그대로 전달되는 모델 ID. |
| `-p, --provider <name>` | `openai` | LLM provider: `openai`, `anthropic`, `zai`, `gemini`, `openrouter`, `groq`, `mistral`, `deepseek`, `xai`. |
| `-l, --language <ko\|en>` | `en` | 분석/문서/프롬프트 출력 언어. |
| `--analyze-only` | `false` | 분석만 실행. `analysis.json` / `analysis.md`만 생성하고 docs/prompts 생략. |
| `--docs-only` | `false` | 디자인 스펙 문서만 생성, 프롬프트 생략. |
| `--prompts-only` | `false` | 프롬프트만 생성, 문서 생략. |
| `--include <paths>` | — | 추가 포함 경로(쉼표 구분). 주로 모노레포 공유 패키지 포함 시 사용. |
| `--dry-run` | `false` | 추출 미리보기만 실행. LLM 호출 없음, API 키 불필요. |
| `-d, --debug` | `false` | 디버그 로그 활성화. |

예시:

```bash
ditto analyze ./apps/web
ditto analyze https://github.com/user/repo
ditto analyze ./apps/web --include packages/ui,packages/tokens
ditto analyze ./apps/web --analyze-only
ditto analyze ./apps/web --dry-run
```

### `ditto generate --from <analysis.json>`

기존 분석 파일에서 docs/prompts를 생성합니다. 템플릿 기반이므로 LLM 호출이 없습니다.

옵션:

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `--from <path>` | 필수 | `analysis.json` 경로 |
| `-o, --output <dir>` | `./ditto-output` | 생성 결과 출력 디렉토리 |
| `-l, --language <ko\|en>` | `en` | 출력 언어 |
| `-t, --target <preset\|auto>` | `auto` | 타겟 프리셋: `auto`, `next-tailwind`, `react-css-modules`, `vue-css`, `svelte-tailwind` |
| `--docs-only` | `false` | 문서만 생성 |
| `--prompts-only` | `false` | 프롬프트만 생성 |
| `--dry-run` | `false` | 파일 쓰기 없이 생성 결과 미리보기 |

예시:

```bash
ditto generate --from ditto-output/my-react-app/analysis.json
ditto generate --from ditto-output/my-react-app/analysis.json --target next-tailwind
ditto generate --from ditto-output/my-react-app/analysis.json --docs-only
ditto generate --from ditto-output/my-react-app/analysis.json --dry-run
```

### `ditto init`

대화형 초기 설정: provider를 선택하고 API 키를 입력하면 `~/.ditto/settings.json`에 저장됩니다.

```bash
ditto init
```

### `ditto config`

전역 설정(`~/.ditto/settings.json`)을 관리합니다.

명령:

| 명령 | 설명 |
| --- | --- |
| `ditto config show` | 현재 병합된 설정 표시(API 키 마스킹) |
| `ditto config set <key> <value>` | 설정 값 저장 |
| `ditto config path` | 설정 파일 경로 출력 |

`config set` 가능 키:

| 키 | 설명 |
| --- | --- |
| `output` | 기본 출력 베이스 경로 |
| `language` | 기본 출력 언어 (`en` 또는 `ko`) |
| `model` | 기본 모델 ID |
| `provider` | 기본 provider (`openai`, `anthropic`, `zai`, `gemini`, `openrouter`, `groq`, `mistral`, `deepseek`, `xai`) |

API 키는 `config set`이 아니라 환경변수 또는 `.env`로 설정합니다.

## Provider/Model 지원

지원 provider:

| Provider | API 키 환경변수 | 모델 처리 방식 | Structured output |
| --- | --- | --- | --- |
| `openai` | `OPENAI_API_KEY` | `openai.chat(<model>)`으로 전달 | 지원 |
| `anthropic` | `ANTHROPIC_API_KEY` | `anthropic(<model>)`으로 전달 | 지원 |
| `zai` | `ZAI_API_KEY` | Z.AI base URL의 OpenAI 호환 클라이언트로 전달 | 미지원(`json_object` 경로 사용) |
| `gemini` | `GOOGLE_GENERATIVE_AI_API_KEY` | `google(<model>)`로 전달 | 지원 |
| `openrouter` | `OPENROUTER_API_KEY` | OpenRouter base URL의 OpenAI 호환 클라이언트로 전달 | 미지원(`json_object` 경로 사용) |
| `groq` | `GROQ_API_KEY` | `groq(<model>)`로 전달 | 지원 |
| `mistral` | `MISTRAL_API_KEY` | `mistral(<model>)`로 전달 | 지원 |
| `deepseek` | `DEEPSEEK_API_KEY` | `deepseek(<model>)`로 전달 | 지원 |
| `xai` | `XAI_API_KEY` | `xai(<model>)`로 전달 | 지원 |

모델 호환 계약:

| Provider | `--model` 처리 방식 | 권장 모델 성격 | 실무 기본값 |
| --- | --- | --- | --- |
| `openai` | `openai.chat(model)`로 그대로 전달 | JSON/schema 출력 안정성이 높은 chat 모델 | `gpt-5.4-mini` |
| `anthropic` | `anthropic(model)`로 그대로 전달 | JSON/schema 출력 안정성이 높은 chat 모델 | 팀 표준 Anthropic 모델 ID 사용 |
| `zai` | Z.AI base URL의 OpenAI 호환 `chat(model)`로 전달 | strict JSON-object 지시를 잘 따르는 chat 모델 | `glm-5` 계열 ID 권장 |
| `gemini` | `google(model)`로 그대로 전달 | JSON/schema 출력 안정성이 높은 chat 모델 | 팀 표준 Gemini 모델 ID 사용 |
| `openrouter` | OpenRouter base URL의 OpenAI 호환 `chat(model)`로 전달 | strict JSON-object 지시를 잘 따르는 chat 모델 | OpenRouter 지원 chat 모델 ID 사용 |
| `groq` | `groq(model)`로 그대로 전달 | JSON/schema 출력 안정성이 높은 빠른 chat 모델 | 팀 표준 Groq 모델 ID 사용 |
| `mistral` | `mistral(model)`로 그대로 전달 | JSON/schema 출력 안정성이 높은 chat 모델 | 팀 표준 Mistral 모델 ID 사용 |
| `deepseek` | `deepseek(model)`로 그대로 전달 | JSON/schema 출력 안정성이 높은 chat 모델 | 팀 표준 DeepSeek 모델 ID 사용 |
| `xai` | `xai(model)`로 그대로 전달 | JSON/schema 출력 안정성이 높은 chat 모델 | 팀 표준 xAI 모델 ID 사용 |

모델 지원 정책/보장:

- Dittofy는 고정 allowlist를 강제하지 않습니다.
- `--model` 값은 provider SDK로 그대로 전달되며 내부에서 재작성하지 않습니다.
- 유효하지 않거나 미지원인 모델 ID는 provider API 오류로 그대로 노출됩니다.
- OpenAI, Anthropic, Gemini, Groq, Mistral, DeepSeek, xAI는 schema-native structured output을 우선 시도합니다.
- Z.AI와 OpenRouter는 이 프로젝트에서 JSON-object 모드를 사용합니다.
- `analyze`는 LLM 호출이 있고, `generate`는 결정적 템플릿 렌더링이라 LLM 호출이 없습니다.
- structured output 실패 시 JSON 모드로 fallback합니다.
- 스키마 검증 실패 시 피드백을 붙여 validation retry를 수행합니다.
- `429`, `5xx`, 네트워크 타임아웃 등은 재시도하고, 인증/과금/권한 오류는 즉시 실패합니다.

빠른 검증 명령:

```bash
ditto analyze ./my-app --provider <provider> --model <model-id> --analyze-only
```

런타임 프로파일 기본값:

- `openai`, `anthropic`, `gemini`, `openrouter`, `groq`, `mistral`, `deepseek`, `xai`: token `1.0x`, timeout `1.0x`, max retries `3`.
- `zai`: token `1.5x`, timeout `2.0x`, max retries `2`.

모델 관련 장애 패턴:

| 증상 | 원인 후보 | 대응 |
| --- | --- | --- |
| `API key is required` | 선택한 provider의 키 누락 | 위 provider 표의 환경변수 키를 설정 |
| 모델 미존재/잘못된 요청 오류 | provider에 맞지 않는 모델 ID | provider 콘솔에서 모델 ID 확인 후 재실행 |
| `Output truncated`가 반복됨 | 출력 예산 대비 응답이 큼 | 더 강한 모델 사용 또는 분석 범위 축소(`--include`, 앱 경로 지정) |
| 스키마 검증 실패 반복 | 모델의 스키마 준수 품질 부족 | 같은 provider에서 더 강한 모델로 변경 |

## Target Presets (`generate --target`)

| Preset | Framework | Language | Styling | Build |
| --- | --- | --- | --- | --- |
| `auto` | 분석 결과 기반 자동 결정 | 자동 | 자동 | 자동 |
| `next-tailwind` | Next.js | TypeScript | Tailwind CSS | Next.js built-in |
| `react-css-modules` | React | TypeScript | CSS Modules | Vite |
| `vue-css` | Vue | TypeScript | Scoped CSS | Vite |
| `svelte-tailwind` | Svelte | TypeScript | Tailwind CSS | Vite |

## 설정 우선순위

설정은 아래 순서로 병합됩니다.

1. 내장 기본값
2. `~/.ditto/settings.json`
3. 프로젝트 설정 / `.env` (`c12` 로딩)
4. CLI 인자

`ditto.config.ts` 예시:

```ts
export default {
	output: "ditto-output",
	provider: "openai",
	model: "gpt-5.4-mini",
	language: "en",
}
```

API 키:

```bash
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
ZAI_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
OPENROUTER_API_KEY=...
GROQ_API_KEY=...
MISTRAL_API_KEY=...
DEEPSEEK_API_KEY=...
XAI_API_KEY=...
```

## 모노레포 참고

- 특정 앱 경로를 넘기면 모노레포 루트/워크스페이스 의존 패키지를 자동 감지합니다.
- `--include`로 공유 패키지를 강제로 분석 컨텍스트에 포함할 수 있습니다.
- 모노레포 루트에 FE 앱이 여러 개면 앱 경로를 명시하도록 안내합니다.

## 트러블슈팅

- `API key is required`: 선택한 provider에 맞는 키를 설정하세요.
- `Unknown target preset`: 지원 프리셋 이름을 사용하세요.
- `Analysis file not found`: 먼저 `ditto analyze`를 실행하거나 `--from` 경로를 수정하세요.

## License

MIT
