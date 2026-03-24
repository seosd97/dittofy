# Ditto

FE 레포지토리를 분석하여 디자인 에센스를 추출하고, AI 코딩 에이전트용 구현 프롬프트를 생성하는 CLI 도구.

> "레퍼런스 사이트 보고 이런 느낌으로 만들어줘" → 디자인 스펙 + 단계별 구현 프롬프트

## 작동 방식

Ditto는 프론트엔드 프로젝트의 소스 코드를 분석하여 디자인 시스템의 **에센스**(색상, 타이포그래피, 레이아웃, 인터랙션 등)를 추출합니다. 원본을 1:1로 복제하는 것이 아니라, 핵심 디자인 패턴을 추출하여 **새로운 프로젝트에 적용할 수 있는 형태**로 변환합니다.

```
소스 레포 → [추출] → [분석] → [문서화] → [프롬프트 생성] → AI 에이전트가 구현
```

## Quick Start

```bash
# 설치
npm install -g ditto

# API 키 설정 (.env 파일 또는 환경변수)
echo "OPENAI_API_KEY=sk-..." > .env
# 또는: export OPENAI_API_KEY=sk-...

# 로컬 프로젝트 분석 + 생성 (한번에)
ditto analyze ./my-react-app

# GitHub 레포지토리 분석
ditto analyze https://github.com/user/repo

# 모노레포: 특정 앱 지정
ditto analyze ./my-monorepo/apps/web

# 분석만 (analysis.json 생성, 문서/프롬프트 나중에)
ditto analyze ./my-react-app --analyze-only

# 기존 분석으로 다른 환경용 생성 (무료, LLM 호출 없음)
ditto generate --from ditto-output/analysis.json --target next-tailwind
```

## 산출물

분석이 완료되면 다음과 같은 구조로 결과물이 생성됩니다:

```
ditto-output/
├── analysis.json              # 구조화된 분석 결과 (7개 aspect + essence)
├── analysis.md                # 사람이 읽을 수 있는 분석 요약
├── design-spec/               # 디자인 스펙 문서
│   ├── 01-design-tokens.md    #   색상, 간격, 반경, 그림자, 브레이크포인트
│   ├── 02-typography.md       #   폰트, 타입 스케일, 굵기
│   ├── 03-component-catalog.md #  컴포넌트 패턴 레퍼런스
│   ├── 04-layout-system.md    #   그리드, 컨테이너, 네비게이션
│   ├── 05-page-structures.md  #   페이지 구성 패턴 (동적)
│   ├── 06-responsive-strategy.md # 반응형 전략 (동적)
│   └── 07-interactions.md     #   애니메이션, 트랜지션 (동적)
└── prompts/                   # AI Agent 구현 프롬프트
    ├── README.md              #   사용 가이드 (여기서 시작!)
    ├── step-01-setup.md
    ├── step-02-design-tokens.md
    ├── step-03-typography.md
    ├── step-04-layout-shell.md
    ├── step-05-showcase-pages.md
    ├── step-06-responsive.md
    └── step-07-interactions.md
```

- **design-spec/**: 분석 결과를 사람이 읽을 수 있는 마크다운 문서로 정리한 것. 디자인 리뷰나 참고 자료로 활용.
- **prompts/**: AI 코딩 에이전트에게 넘길 구현 프롬프트. 각 프롬프트 안에 디자인 스펙이 인라인으로 포함되어 self-contained.
- `05~07` 문서는 충분한 데이터가 있을 때만 생성됩니다 (dynamic).

## 생성된 프롬프트 사용하기

### 시작하기

`prompts/README.md`를 열면 전체 스텝 목록, 의존 관계, 각 스텝이 무엇을 만들고 무엇을 전제하는지 정리되어 있습니다.

### 사용 흐름

**1. AI 코딩 에이전트를 프로젝트 디렉토리에서 열고, Step 1 파일 내용을 붙여넣기:**

```
이 프로젝트에 디자인 시스템을 구현하려고 해. 아래 프롬프트를 읽고 실행해줘.

(step-01-setup.md 내용 붙여넣기)
```

**2. 에이전트가 완료하면 결과 확인 후 다음 스텝 전달:**

```
이전 스텝 완료됐어. 다음 스텝 진행해줘.

(step-02-design-tokens.md 내용 붙여넣기)
```

**3. 모든 스텝을 순서대로 반복.**

### 각 스텝에서 에이전트가 하는 일

각 프롬프트에는 에이전트의 행동 순서가 구조화되어 있습니다:

1. **Prerequisites 확인** — 이전 스텝 완료 여부 확인
2. **워킹 디렉토리 스캔** — 이전 스텝이 만든 파일(토큰 설정, 레이아웃 컴포넌트 등) 찾아 읽기
3. **기존 산출물 확인** — 이 스텝이 전제하는 것들이 존재하는지 검증
4. **Instructions 실행** — 인라인된 디자인 스펙을 참고하여 코드 작성
5. **산출물 체크리스트 확인** — Expected Outcome에 명시된 항목들이 프로젝트에 존재하는지 검증

이 구조 덕분에 에이전트가 이전 스텝의 결과물을 반드시 읽고, 그 위에 빌드합니다.

### 팁

- **스텝을 건너뛰지 마세요.** 각 스텝은 이전 스텝의 산출물에 의존합니다.
- **다음으로 넘어가기 전에 확인하세요.** Expected Outcome에 나열된 항목들이 실제로 만들어졌는지 체크.
- **추가 디자인 문서 불필요.** 모든 디자인 스펙이 프롬프트 안에 인라인되어 있습니다.
- **프레임워크가 감지된 경우**, 프롬프트가 해당 스택에 맞춰 생성됩니다 (예: Tailwind이면 `tailwind.config`에 토큰 정의).

### 고급: 에이전트에 전체 맥락 설정

매번 붙여넣는 대신, `prompts/README.md`의 **Step Dependencies**와 **Artifact Flow** 섹션을 에이전트의 persistent instructions에 넣어두면 (Claude Code의 `CLAUDE.md`, Cursor의 `.cursorrules` 등) 에이전트가 항상 전체 구현 계획을 인지한 상태에서 각 스텝을 실행합니다.

## 환경 인식

Ditto는 소스 레포의 기술 스택을 감지하여 두 가지 모드로 프롬프트를 생성합니다:

| 모드 | 조건 | 동작 |
|------|------|------|
| **existing-project** | 프레임워크가 중~높은 신뢰도로 감지됨 | 감지된 스택의 컨벤션에 맞춰 프롬프트 생성 (예: Next.js + Tailwind) |
| **greenfield** | 프레임워크 미감지 또는 낮은 신뢰도 | 스택 비의존적 프롬프트 생성, 에이전트가 스택 선택 |

## 파이프라인

Ditto는 **2-command 분리** 설계:
- `ditto analyze` — LLM 비용 발생 (분석)
- `ditto generate` — 무료, 반복 가능 (생성)

```
ditto analyze:  Validation → Phase 1: Scan → Phase 2: LLM Analysis → analysis.json
ditto generate: analysis.json → Phase 3: Docs → Phase 4: Prompts
```

| Phase | 설명 | LLM |
|-------|------|-----|
| **Validation** | API 키, 모델/프로바이더 호환성 검증 | ✗ |
| **Phase 1: Scan** | 파일 트리 스캔, 기술 스택 감지, 모노레포 감지 | ✗ |
| **Phase 2: Analysis** | LLM이 분석 계획 수립 → Wave별 병렬 분석 → 에센스 합성 | ✓ |
| **Phase 3: Docs** | 분석 결과를 마크다운 디자인 스펙으로 생성 | ✗ |
| **Phase 4: Prompts** | 환경 프로파일 → 스텝 계획 → 스텝별 프롬프트 생성 | ✗ |

### 7개 분석 측면 (Aspects)

| Aspect | 분석 대상 |
|--------|----------|
| **tokens** | 색상 팔레트, 간격 체계, 반경, 그림자, 브레이크포인트 |
| **typography** | 폰트 패밀리, 타입 스케일, 굵기, 줄 높이 |
| **components** | 컴포넌트 패턴, props, 구성 방식 (참고 자료로만 사용) |
| **layout** | 그리드 시스템, 컨테이너, 네비게이션 구조 |
| **pages** | 페이지 구성 패턴, 섹션 배치 |
| **responsive** | 브레이크포인트, 적응 패턴, 모바일 전략 |
| **interactions** | 애니메이션, 트랜지션, 호버/포커스 상태 |

## CLI 옵션

### `ditto analyze <source> [options]`

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `<source>` | 로컬 경로 또는 GitHub URL | (필수) |
| `--output, -o` | 출력 디렉토리 | `ditto-output` |
| `--model, -m` | LLM 모델 | `gpt-5.2` |
| `--provider, -p` | LLM provider (`openai`, `anthropic`, `zai`) | `openai` |
| `--language, -l` | 출력 언어 (`ko`, `en`) | `ko` |
| `--analyze-only` | 분석만 수행 (analysis.json 생성, 문서/프롬프트 스킵) | `false` |
| `--dry-run` | 추출만 수행 (LLM 호출 없이 구조 확인, API 키 불필요) | `false` |
| `--include` | 추가 포함 경로 (쉼표 구분, 모노레포용) | — |
| `--docs-only` | 디자인 스펙만 생성 (프롬프트 스킵) | `false` |
| `--prompts-only` | 프롬프트만 재생성 (문서 스킵) | `false` |
| `--debug, -d` | 디버그 로깅 (LLM I/O, .tmp/ 보존) | `false` |

### `ditto generate --from <path> [options]`

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--from` | analysis.json 경로 | (필수) |
| `--output, -o` | 출력 디렉토리 | `./ditto-output` |
| `--target, -t` | 타겟 환경 프리셋 (`auto`, `next-tailwind`, 등) | `auto` |
| `--language, -l` | 출력 언어 (`ko`, `en`) | `en` |
| `--dry-run` | 생성 미리보기 (파일 쓰기 없음) | `false` |
| `--docs-only` | 디자인 스펙만 생성 | `false` |
| `--prompts-only` | 프롬프트만 생성 | `false` |

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

API 키는 `.env` 파일 또는 환경변수로 설정:

```bash
# .env 파일 (프로젝트 루트)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ZAI_API_KEY=...

# 또는 환경변수로 직접 설정
export OPENAI_API_KEY=sk-...
```

## 모노레포 지원

Ditto는 pnpm workspaces 기반 모노레포를 자동 감지합니다.

```bash
# 특정 앱 지정 (모노레포 루트를 자동 감지)
ditto analyze ./my-monorepo/apps/web

# 추가 패키지 포함 (공유 UI 라이브러리 등)
ditto analyze ./my-monorepo/apps/web --include packages/ui,packages/tokens
```

- 자동으로 워크스페이스 의존성을 감지하여 관련 패키지의 파일 트리를 포함
- 모노레포 루트를 가리키면 FE 앱 목록을 안내

## 요구 사항

- Node.js >= 20
- pnpm (개발 시)

## 개발

```bash
pnpm install
pnpm dev <source>          # 개발 모드 실행
pnpm build                 # 빌드
pnpm test:run              # 테스트
pnpm typecheck             # 타입 체크
pnpm lint                  # 린트
```

## License

MIT
