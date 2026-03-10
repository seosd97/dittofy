# 00. Project Overview — Ditto

## 1. 프로젝트 정의

### 1.1 프로젝트명
**Ditto**

### 1.2 한 줄 요약
디자인 레퍼런스(FE 레포지토리)를 입력받아 디자인의 핵심 스타일을 분석하고, 해당 스타일의 디자인을 양산할 수 있는 상세 문서와 AI Coding Agent용 단계별 구현 Prompt를 자동 생성하는 CLI 도구.

### 1.3 프로젝트 배경
- 디자인 레퍼런스를 보고 "이 느낌으로 만들어줘"라는 요청은 매우 흔하지만, 사람마다 해석이 다르고 AI Agent에게 전달하기엔 정보가 불충분함
- 기존 방식: 레퍼런스를 눈으로 보고 수동으로 스타일을 파악 → 비효율적이고 누락이 많음
- 목표 방식: 레퍼런스를 체계적으로 분석 → 해당 스타일을 양산할 수 있는 수준의 문서 자동 생성 → AI Coding Agent가 바로 작업 가능한 Prompt 생성

### 1.4 핵심 가치
1. **스타일 본질 포착 (Essence Capture)**: 단순 복제가 아닌, 디자인의 핵심 컨셉과 원칙을 파악하여 같은 스타일의 디자인을 양산할 수 있는 수준의 이해
2. **자동화 (Automation)**: LLM 기반으로 최대한 자동 분석, 필요시 사람이 보완하는 반자동 허용
3. **실행 가능성 (Actionability)**: 생성된 Prompt로 AI Coding Agent가 바로 프로젝트 셋업 및 구현 가능

### 1.5 피델리티 철학
> 이 시스템은 레퍼런스를 1:1로 복제하는 것이 **아니다**.
> 디자인의 핵심 에센스(컨셉, 톤, 패턴, 구조적 특성)를 추출하여,
> "이 스타일에 맞는 새로운 페이지/컴포넌트"를 만들 수 있는 디자인 시스템 문서를 만드는 것이 목적이다.
>
> 따라서:
> - border-radius가 정확히 14px인지는 중요하지 않지만, "이 디자인은 부드러운 둥근 모서리를 선호한다"는 중요하다
> - 정확한 hex 값보다, 컬러 팔레트의 톤 & 무드 체계가 더 중요하다
> - 다만 디자인 컨셉의 핵심이 되는 특징적 수치(예: 극단적으로 큰 border-radius, 특이한 그리드 비율 등)는 정확하게 포착한다

---

## 2. 제품 형태 & 사용 시나리오

### 2.1 제품 형태
- **npm 패키지로 배포되는 CLI 도구**
- 설치: `npm install -g ditto` (또는 `npx ditto`)
- 실행: `ditto analyze ./path/to/repo` 또는 `ditto analyze https://github.com/user/repo`
- Monorepo: `ditto analyze ./repo --package apps/web` (패키지 경로 지정, 미지정 시 자동 감지)

### 2.2 타겟 사용자
- **1차**: 본인 (개인 사용, 안정화 목적)
- **2차**: 팀/외부 공유 (안정화 이후, npm 배포)

### 2.3 주요 사용 시나리오

**시나리오 A: 로컬 프로젝트 분석**
```
사용자가 로컬 FE 프로젝트 경로를 지정
→ Ditto가 디자인을 분석
→ 디자인 스펙 문서 + AI Agent용 Prompt 세트 생성
```

**시나리오 B: GitHub 레포 분석**
```
사용자가 GitHub URL을 지정
→ Ditto가 레포를 클론하여 분석
→ 디자인 스펙 문서 + AI Agent용 Prompt 세트 생성
```

**시나리오 C: 생성된 Prompt로 새 프로젝트 구현**
```
생성된 단계별 Prompt를 AI Coding Agent (Claude Code, Cursor 등)에 전달
→ 레퍼런스의 디자인 스타일을 반영한 새 프로젝트가 구현됨
```

---

## 3. 전체 처리 흐름

```
Input (Repo URI / Dir)
        │
        ▼
  Phase 1: Extraction     ─── 코드, 파일구조, 설정, 에셋 등 원시 데이터 수집
        │
        ▼
  Phase 2: Analysis        ─── 디자인 토큰, 컴포넌트 패턴, 레이아웃, 인터랙션 분석 (LLM 핵심 구간)
        │
        ▼
  Phase 3: Documentation   ─── 분석 결과를 사람이 읽을 수 있는 디자인 스펙 문서로 변환
        │
        ▼
  Phase 4: Prompt Gen      ─── 문서 기반 AI Coding Agent용 단계별 구현 Prompt 생성
        │
        ▼
  Output
    ├── design-spec/       ─── 마크다운 기반 디자인 스펙 문서 세트
    └── prompts/           ─── AI Coding Agent용 단계별 실행 Prompt 세트
```

---

## 4. 핵심 결정 사항

### 4.1 입력 (Input)
- **v1 우선**: FE 레포지토리 (로컬 디렉토리, GitHub URL)
- **v1 이후 확장**: Figma URL, Framer URL, 일반 웹사이트 URL
- **단일 레퍼런스만 지원** (다중 레퍼런스 조합은 v1 범위 밖)

### 4.2 타겟 구현 스택 (Prompt가 생성할 프로젝트의 스택)
- **기본**: React + Vite (SPA), Next.js (SSR/SSG)
- 분석 결과에 따라 특수한 경우 다른 스택 허용 (예: Astro, Svelte 등)

### 4.3 자동화 수준
- 완전 자동 지향 (LLM 기반)
- 결과 검증/보완은 사람이 가능한 반자동 허용
- 피드백 워크플로우: 결과 확인 → 디자인 스펙 문서 수동 수정 → `--prompts-only`로 Prompt 재생성

### 4.4 반응형
- 레퍼런스의 반응형 대응 수준에 맞춰 분석
- 레퍼런스가 반응형을 지원하지 않으면 단일 뷰포트 기준 분석

### 4.5 Prompt 대상
- AI Coding Agent 범용 (Claude Code, Cursor, Windsurf, Copilot 등)
- 특정 Agent에 종속되지 않는 범용적 지시문

---

## 5. 범위 정의 (Scope)

### 5.1 In Scope (v1)
- GitHub Repo URL 입력 분석 (clone 후 분석)
- 로컬 디렉토리 입력 분석
- 디자인 에센스 분석 (컨셉, 톤, 무드)
- 디자인 토큰 체계 분석 (Color, Typography, Spacing, Shadow 등)
- 컴포넌트 구조 및 패턴 분석
- 레이아웃 시스템 분석
- 페이지 구성 분석
- 반응형 대응 전략 분석
- 인터랙션/애니메이션 패턴 분석
- 재현용 상세 디자인 스펙 문서 생성
- AI Coding Agent용 단계별 구현 Prompt 생성
- npm 패키지 배포, CLI 인터페이스

### 5.2 Out of Scope (v1)
- Figma / Framer / 일반 웹사이트 URL 분석
- 다중 레퍼런스 조합
- 실시간 레퍼런스 변경 감지 및 문서 갱신
- 구현 결과물과 원본 시각적 비교 검증 (visual diff)
- 백엔드/API 분석
- GUI/웹 인터페이스
- 비용 관리 기능 (`--dry-run`, `--max-files` 등) — v1 이후 검토
- Scaffold 자동 생성 (`--scaffold`) — v1 이후 검토

### 5.3 비기능 요구사항
- 단일 레포 분석 완료까지 합리적인 시간 내 처리 (레포 크기에 비례)
- 생성 문서는 마크다운 기반, 사람이 읽기 편한 포맷
- 생성 Prompt는 주요 AI Coding Agent에서 범용적으로 동작
- CLI UX: 진행 상태 표시, 에러 메시지 명확

---

## 6. 용어 정의

| 용어 | 정의 |
|------|------|
| **레퍼런스 (Reference)** | 분석 대상이 되는 디자인 소스 (v1에서는 FE 레포지토리) |
| **디자인 에센스 (Design Essence)** | 디자인의 핵심 컨셉, 톤, 무드, 스타일 정체성 |
| **디자인 토큰 (Design Token)** | 디자인 시스템의 최소 단위 값 (색상, 간격, 폰트 크기 등) |
| **디자인 스펙 (Design Spec)** | 디자인을 재현하기 위한 상세 사양 문서 |
| **구현 Prompt** | AI Coding Agent에게 전달하여 실제 코드를 생성하게 하는 지시문 |
| **분석 결과 (Analysis Result)** | 레퍼런스에서 추출한 구조화된 디자인 정보 |
| **양산 (Mass Production)** | 동일 스타일로 새로운 UI를 만들어내는 것. v1에서는 새 프로젝트 생성이 기본이며, 디자인 스펙 문서를 활용한 기존 프로젝트 확장도 가능 |

---

## 7. 관련 문서 인덱스

### 기획 문서 (What & Why)
| 문서 | 설명 |
|------|------|
| [01-analysis-scope.md](./01-analysis-scope.md) | 무엇을 분석하는가 — 분석 항목, 범위, 깊이 |
| [02-output-documents.md](./02-output-documents.md) | 어떤 문서를 만드는가 — 산출물 문서 구조 & 템플릿 |
| [03-output-prompts.md](./03-output-prompts.md) | 어떤 Prompt를 만드는가 — Prompt 구조 & 단계 설계 |
| [04-quality-criteria.md](./04-quality-criteria.md) | 품질 기준 & 검증 방법 |
| [05-roadmap.md](./05-roadmap.md) | 마일스톤 & 확장 계획 |

### 기술 문서 (How) — 별도 디렉토리
| 문서 | 설명 |
|------|------|
| [../technical/00-tech-decisions.md](../technical/00-tech-decisions.md) | 기술 스택 결정 기록 |
| [../technical/01-architecture.md](../technical/01-architecture.md) | 시스템 아키텍처, 디렉토리 구조, 모듈 의존성 |
| [../technical/02-cli-design.md](../technical/02-cli-design.md) | CLI 설계, 명령어, 설정 관리 |
| [../technical/03-type-definitions.md](../technical/03-type-definitions.md) | 핵심 타입 정의 (Phase 1~4 입출력) |
| [../technical/04-pipeline-design.md](../technical/04-pipeline-design.md) | 4-Phase 파이프라인 상세 설계 |
| [../technical/05-llm-integration.md](../technical/05-llm-integration.md) | LLM 통합, 컨텍스트 관리, 청킹 전략 |
| [../technical/06-implementation-tasks.md](../technical/06-implementation-tasks.md) | 마일스톤별 구현 태스크 상세 |

---

## 8. 포지셔닝 — 기존 도구와의 차별점

| 대안 | 접근 방식 | Ditto와의 차이 |
|------|----------|-------------|
| v0 (Vercel) | 프롬프트 → UI 코드 생성 | 레퍼런스 분석 없음, 일회성 생성, 양산 불가 |
| screenshot-to-code | 스크린샷 → 1:1 복제 코드 | 에센스 추출이 아닌 복제, 양산 불가 |
| "이 사이트 보고 만들어줘" | 비체계적 구두 지시 | 재현 불가, 정보 누락, 품질 편차 큼 |
| **Ditto** | 코드 분석 → 에센스 추출 → 문서 + Prompt | **양산 가능한 디자인 시스템 문서**, 체계적 단계별 Prompt |

Ditto의 핵심 차별점은 "에센스 추출 → 양산"이라는 목적에 있다. 1:1 복제나 일회성 생성이 아닌, 디자인의 본질을 이해하고 같은 스타일의 새로운 UI를 반복적으로 만들어낼 수 있는 체계를 제공한다.
