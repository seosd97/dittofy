# 00. Tech Decisions — 기술 스택 결정 기록

## 1. 핵심 기술 스택

| 항목 | 선택 | 버전/비고 |
|------|------|----------|
| 런타임 | Node.js | >= 20 LTS (개발 시 tsx로 직접 실행) |
| 언어 | TypeScript | ESM으로 작성, 빌드 시 CJS+ESM 듀얼 출력 |
| 패키지 매니저 | pnpm | 엄격한 의존성 관리, 빠른 설치 |
| 모듈 시스템 | ESM (소스) → CJS+ESM (빌드) | `"type": "module"` in package.json |

---

## 2. CLI & UX

| 항목 | 선택 | 이유 |
|------|------|------|
| CLI 프레임워크 | **citty** (unjs) | ESM 네이티브, 가벼움, 타입 안전 |
| 로깅/UX | **consola** (unjs) | 로깅, 스피너, 프롬프트 통합 |
| 설정 관리 | **c12** (unjs) | `.ts` 설정 파일 네이티브, 환경변수 자동 매핑 |

---

## 3. LLM 통합

| 항목 | 선택 | 이유 |
|------|------|------|
| LLM SDK | **Vercel AI SDK** (`ai` 패키지) | 멀티 프로바이더, `generateObject()` + Zod structured output |
| 기본 모델 | **GPT-5.2** | 코드 이해력 + 자연어 표현력 균형 |
| 모델 변경 | `--model` 옵션 | Claude Sonnet, Haiku, GPT-4o 등으로 전환 가능 |
| 스키마 검증 | **Zod** | AI SDK structured output 직접 연동, TS 타입 추론 |

---

## 4. 빌드 & 개발 도구

| 항목 | 선택 | 이유 |
|------|------|------|
| 빌드 | **tsdown** | Rolldown 기반, 빠르고 현대적, CJS/ESM 듀얼 빌드 |
| 개발 실행 | **tsx** | 빌드 없이 TypeScript 직접 실행 |
| 테스트 | **Vitest** | ESM 네이티브, TS 빌트인, Jest 호환 API |
| 린팅/포맷 | **Biome** | ESLint+Prettier 통합, Rust 기반 빠름 |

---

## 5. 유틸리티

| 항목 | 선택 | 이유 |
|------|------|------|
| 레포 다운로드 | **giget** (unjs) | tar 기반 빠른 다운로드, Git 불필요 |
| 파일 탐색 | **tinyglobby** | globby 후속, 더 빠르고 가벼움 |
| 파일 시스템 | Node.js `fs/promises` | 추가 의존성 최소화 |
| Git 호스팅 | **GitHub** | npm 배포, Actions CI/CD 최적 |

---

## 6. 의존성 목록

### Production Dependencies
```
ai                    # Vercel AI SDK
@ai-sdk/openai        # OpenAI 프로바이더 (GPT-5.2)
@ai-sdk/anthropic     # Anthropic 프로바이더 (Claude)
zod                   # 스키마 검증 & structured output
citty                 # CLI 프레임워크
consola               # 로깅/UX
c12                   # 설정 관리
giget                 # 레포 다운로드
tinyglobby            # 파일 글로브 패턴
```

### Dev Dependencies
```
typescript            # 언어
tsx                   # 개발 시 실행
tsdown                # 빌드
vitest                # 테스트
@biomejs/biome        # 린팅/포맷
```

---

## 7. 프로젝트 설정

### Node.js 최소 버전
- `engines.node`: `">=20.0.0"`
- 이유: `fetch` 빌트인, 안정적 ESM 지원, 2026년 4월까지 Active LTS

### TypeScript 설정 방침
- `target`: `ES2022`
- `module`: `ESNext`
- `moduleResolution`: `bundler`
- `strict`: `true`

### Biome 설정 방침
- formatter: 들여쓰기 탭, 세미콜론 없음
- linter: 추천 규칙 전체 활성화

---

## 8. 결정 근거 요약

### unjs 생태계 채택 이유
citty, consola, c12, giget 등 unjs 생태계를 적극 활용한다.
- ESM 네이티브로 설계되어 현대적 Node.js 프로젝트에 자연스러움
- 각 패키지가 하나의 책임에 집중하여 가벼움
- 일관된 API 스타일로 학습 비용 최소화
- Nuxt/Nitro 등 대규모 프로젝트에서 검증됨

### Vercel AI SDK 채택 이유
- `generateObject()` + Zod 스키마로 LLM의 structured output을 타입 안전하게 처리
- 프로바이더 교체가 import 한 줄 변경으로 가능 (OpenAI ↔ Anthropic ↔ Google)
- Ditto의 핵심인 `analysis.json` 생성에 최적

### tsdown 채택 이유
- tsup의 후속으로, Rolldown(Rust 기반 번들러) 위에서 동작
- 새 프로젝트이므로 호환성 부담 없이 최신 도구 채택 가능
- CLI 도구의 bin 필드, shebang, 듀얼 빌드 지원
