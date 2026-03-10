# 03. Output Prompts — 어떤 Prompt를 만드는가

## 1. Prompt의 목적

> AI Coding Agent가 이 Prompt 세트를 단계별로 실행하면,
> 레퍼런스의 디자인 에센스를 반영한 **새 프로젝트가 처음부터 구현**된다.
> 디자인 스펙 문서는 기존 프로젝트 확장에도 활용 가능하나, Prompt 세트는 새 프로젝트 생성에 초점을 맞춘다.

### 핵심 원칙
1. **단계별 분리**: 한 번에 모든 것을 구현하라고 하지 않는다. 각 Prompt는 하나의 명확한 목표를 가진다.
2. **자기 완결성**: 각 Prompt는 필요한 모든 맥락을 포함한다. 이전 Prompt나 외부 문서를 다시 읽지 않아도 된다.
3. **검증 가능성**: 각 단계 완료 후 결과를 검증할 수 있는 기준을 포함한다.
4. **순서 의존성 명시**: 어떤 단계가 선행되어야 하는지 명확히 표시한다.
5. **Agent 중립적**: Claude Code, Cursor, Windsurf 등 특정 AI Agent에 종속되지 않는 범용적 지시문.

---

## 2. 산출물 구조

```
ditto-output/<project-name>/
└── prompts/
    ├── README.md                           # Prompt 세트 사용 가이드
    ├── step-01-project-setup.md
    ├── step-02-design-system.md
    ├── step-03-base-components.md
    ├── step-04-layout-components.md
    ├── step-05-composite-components.md
    ├── step-06-page-implementation.md
    ├── step-07-responsive.md
    └── step-08-interactions.md
```

단계 수는 레퍼런스 복잡도에 따라 **가변적** (간단: 4~5단계, 복잡: 8~12단계).

---

## 3. 각 Prompt의 표준 구조

```markdown
# Step {N}: {단계 제목}

## Goal
{이 단계의 목표를 1~2문장으로}

## Prerequisites
- Step {X} 완료 필요 (없으면 "None")

## Context
{이 단계를 수행하는 데 필요한 배경 정보}
{디자인 스펙에서 관련된 핵심 내용을 인라인으로 포함}

## Instructions
{구체적인 구현 지시사항}

## Design Reference
{이 단계에서 참고해야 할 디자인 토큰, 스타일, 패턴 정보}

## Expected Outcome
{이 단계 완료 후 프로젝트의 상태}

## Validation
{결과물 검증 방법}
```

---

## 4. 단계 구성

### 4.1 기본 단계 (항상 존재)

| Step | 제목 | 목표 | 의존성 |
|------|------|------|--------|
| 1 | Project Setup | 프로젝트 생성, 의존성 설치, 디렉토리 구조 | None |
| 2 | Design System | 디자인 토큰을 코드로 정의, 글로벌 스타일 | Step 1 |

### 4.2 컴포넌트 단계 (분석 결과에 따라 가변)

| Step | 제목 | 목표 | 의존성 |
|------|------|------|--------|
| 3 | Base Components | Primitive 컴포넌트 구현 | Step 2 |
| 4 | Layout Components | Header, Footer, Container 등 | Step 2, 3 |
| 5 | Composite Components | Card, Dialog, Tabs 등 복합 컴포넌트 | Step 3 |

### 4.3 페이지 단계 (분석 결과에 따라 가변)

| Step | 제목 | 목표 | 의존성 |
|------|------|------|--------|
| 6 | Page Implementation | 실제 페이지 구현 | Step 4, 5 |

### 4.4 마무리 단계 (분석 결과에 따라 선택)

| Step | 제목 | 조건 | 의존성 |
|------|------|------|--------|
| 7 | Responsive | 레퍼런스가 반응형 지원 시 | Step 6 |
| 8 | Interactions | 애니메이션/인터랙션이 있을 시 | Step 6 |

### 4.5 인터랙션 통합/분리 기준

컴포넌트 구현 단계(Step 3~5)에서 함께 구현하는 인터랙션과, Step 8에서 별도로 구현하는 인터랙션을 명확히 구분한다.

**컴포넌트 단계에서 함께 구현 (통합):**
- hover/focus/active 상태 스타일 (버튼 색상 변화, 카드 그림자 변화 등)
- disabled 상태 스타일
- 기본 cursor 변경
- focus-visible 아웃라인

**Step 8에서 별도 구현 (분리):**
- 페이지/섹션 진입 애니메이션 (fade-in, slide-up 등)
- 스크롤 기반 애니메이션 (scroll-triggered, parallax)
- 복잡한 트랜지션 (페이지 전환, 모달 열림/닫힘 모션)
- 마이크로인터랙션 (토글 애니메이션, 숫자 카운트업 등)
- 로딩 상태 애니메이션 (스켈레톤, 스피너)

### 4.6 분할 규칙

**한 단계의 범위 기준:**
- 생성/수정하는 파일 수: 5~15개
- 컴포넌트 수: 10개 이내
- Prompt 길이: 2,000~8,000 단어

**분할 조건:**
- 복합 컴포넌트 10개 초과: 카테고리별로 2단계 이상으로 분할
- 페이지 3개 초과: 3페이지씩 나눠 별도 단계
- **목표**: 각 Prompt가 AI Agent의 한 세션에서 처리 가능한 범위

**Agent별 차이 대응:**
- README에 "필요 시 Prompt를 합치거나 나누어 사용" 가이드 포함
- Agent 성능에 따라 사용자가 유연하게 조절

---

## 5. 각 단계에 포함되는 디자인 정보

### 자기 완결성 원칙

각 Prompt는 해당 단계의 **핵심 디자인 정보를 Prompt 내에 직접 포함**한다.
단, 전체 목록 수준의 상세 정보는 문서 참조를 허용한다.

**필수 인라인 (Prompt에 직접 포함):**
- 해당 단계에서 사용하는 디자인 토큰 값
- 해당 단계의 컴포넌트 스펙/레이아웃 패턴
- 디자인 에센스 맥락 (톤/무드, 해당 단계 관련 Do's & Don'ts)

**참조 허용 (문서 경로 안내):**
- 전체 토큰 목록
- 전체 컴포넌트 카탈로그
- 상세 페이지 구조

```
❌ "01-design-tokens.md를 참고하여 색상을 적용하세요."

✅ "다음 색상 토큰을 사용하세요:
    - primary: #1E40AF (주요 CTA, 강조 요소)
    - background: #FFFFFF (기본 배경)
    ..."
```

### 단계별 필요 디자인 정보

| Step | 필요한 Design Spec 영역 |
|------|----------------------|
| 1 (Project Setup) | 기술 스택 정보, 라이브러리 목록 |
| 2 (Design System) | 디자인 토큰 전체, 타이포그래피, 디자인 에센스(톤/무드) |
| 3 (Base Components) | 컴포넌트 카탈로그 중 Primitive 섹션, 관련 토큰 |
| 4 (Layout) | 레이아웃 시스템 전체, 컴포넌트 카탈로그 중 Layout 섹션, 반응형(네비게이션) |
| 5 (Composite) | 컴포넌트 카탈로그 중 Composite 섹션 |
| 6 (Pages) | 페이지 구성 전체, Layout Patterns, 섹션 컴포넌트 특징 |
| 7 (Responsive) | 반응형 전략 전체 |
| 8 (Interactions) | 인터랙션 & 애니메이션 전체 |

---

## 6. 타겟 스택 결정

Prompt가 생성할 프로젝트의 기술 스택:

1. 사용자가 `--stack` 옵션으로 지정 → 해당 스택 사용
2. `auto` 모드 (기본):
   - 레퍼런스가 Next.js → Next.js
   - 레퍼런스가 Vite → React + Vite
   - 레퍼런스가 CRA → React + Vite (CRA 대신 Vite 추천)
   - 특수 프레임워크 (Astro, Svelte 등) → 해당 프레임워크 (확인 필요)
   - 판단 불가 → React + Vite (기본값)

---

## 7. README.md — Prompt 세트 사용 가이드

각 분석 결과에 대해 자동 생성되는 사용 가이드:

**포함 내용:**
- 레퍼런스 정보
- 타겟 스택
- 사용 방법 (순서대로 실행, Agent별 실행 방법 예시)
- Steps Overview 테이블 (번호, 제목, 의존성, 설명)
- Design Spec 참조 안내

---

## 8. Prompt 품질 기준

각 생성된 Prompt가 충족해야 할 기준:

| 기준 | 설명 |
|------|------|
| **Goal 명확성** | 이 단계에서 무엇을 만드는지 1~2문장으로 이해 가능 |
| **자기 완결성** | 이 Prompt만으로 작업 가능 (외부 문서 참조 불필요) |
| **구체성** | "적절하게 스타일링하세요" 같은 모호한 지시가 아닌, 구체적 값/패턴 포함 |
| **검증 가능성** | 완료 후 올바른지 확인할 수 있는 기준 존재 |
| **범위 적절성** | 너무 크지도, 너무 작지도 않은 AI Agent 한 세션 분량 |
| **Agent 중립성** | 특정 도구에 종속된 지시 없음 |
| **에센스 반영** | 값만 나열하지 않고, "왜 이렇게 하는지" 톤/무드 맥락 포함 |
