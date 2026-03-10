# Ditto

FE 레포지토리를 분석하여 디자인 에센스를 추출하고, AI 코딩 에이전트용 구현 프롬프트를 생성하는 CLI 도구.

> "레퍼런스 사이트 보고 이런 느낌으로 만들어줘" → 디자인 스펙 + 단계별 구현 프롬프트

## Quick Start

```bash
npm install -g ditto

export OPENAI_API_KEY=sk-...

ditto analyze ./my-react-app
ditto analyze https://github.com/user/repo
```

## 산출물

```
ditto-output/
├── analysis.json          # 구조화된 분석 결과
├── design-spec/           # 디자인 스펙 문서 (최대 8개)
└── prompts/               # AI Agent 구현 프롬프트
```

## 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--output, -o` | 출력 디렉토리 | `ditto-output` |
| `--model, -m` | LLM 모델 | `gpt-5.2` |
| `--provider, -p` | LLM provider (`openai`, `anthropic`, `zhipu`) | `openai` |
| `--language, -l` | 출력 언어 (`ko`, `en`) | `ko` |
| `--docs-only` | 디자인 스펙만 생성 | `false` |
| `--prompts-only` | 프롬프트만 재생성 | `false` |

## 설정

프로젝트 루트에 `ditto.config.ts`:

```typescript
export default {
  output: "my-output",
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  language: "en",
}
```

API 키는 환경변수 또는 `.env` 파일로 설정.

## 요구 사항

- Node.js >= 20

## License

MIT
