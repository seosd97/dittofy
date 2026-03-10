# 02. Output Documents — 어떤 문서를 만드는가

## 1. 문서의 목적

> 이 문서 세트를 읽은 사람(또는 AI)이, 원본 레퍼런스를 보지 않고도
> **같은 스타일의 새로운 페이지/컴포넌트를 만들 수 있어야** 한다.

### 문서의 독자
- **사람** (디자이너, 개발자) — 디자인 이해 및 리뷰용
- **AI Coding Agent** — Prompt 생성의 기반 자료, 또는 직접 참조용

---

## 2. 산출물 디렉토리 구조

```
ditto-output/<project-name>/
├── design-spec/                      # 디자인 스펙 문서
│   ├── 00-overview.md                # 프로젝트 개요 & 디자인 에센스
│   ├── 01-design-tokens.md           # 디자인 토큰 체계
│   ├── 02-typography.md              # 타이포그래피 상세
│   ├── 03-component-catalog.md       # 컴포넌트 카탈로그
│   ├── 04-layout-system.md           # 레이아웃 시스템
│   ├── 05-page-structures.md         # 페이지별 구성
│   ├── 06-responsive-strategy.md     # 반응형 전략
│   └── 07-interactions.md            # 인터랙션 & 애니메이션
│
├── prompts/                          # → 03-output-prompts.md에서 정의
│
└── analysis.json                     # 기계 판독용 분석 결과 원본
```

> **문서 구성은 동적**: 위 7개 문서는 기본 템플릿이며, 분석 결과에 따라 해당 없는 문서는 생략하고,
> 레퍼런스 특성상 필요한 문서가 있으면 추가 생성한다.
> (예: `dark-mode-strategy.md`, `form-patterns.md` 등)

---

## 3. 각 문서의 역할 & 포함 내용

### 3.1 `00-overview.md` — 프로젝트 개요 & 디자인 에센스

**역할**: 이 문서 하나만 읽어도 디자인의 전체적인 느낌을 파악할 수 있어야 한다.

**포함 내용:**
- 원본 소스 정보 (URL/경로, 감지된 기술 스택, 분석 일시)
- 디자인 에센스 요약 (정체성 한 줄 설명)
- 무드 & 스타일 (스타일 카테고리, 무드 키워드)
- 시각적 특징 요약 (Color mood, Typography, Spacing, Shape, Depth, Motion)
- 디자인 원칙 (이 디자인이 따르는 규칙들)
- Do's & Don'ts (카테고리별: Color, Typography, Spacing, Component, Motion — 각 항목은 '규칙 + 이유' 형태)
- 비슷한 스타일의 레퍼런스
- 생성된 문서 목록 (어떤 문서가 포함/생략되었는지, 각 문서의 존재 이유)

### 3.2 `01-design-tokens.md` — 디자인 토큰 체계

**역할**: 색상, 간격, 그림자 등 디자인 시스템의 기본 값 체계를 정의한다.

**포함 내용:**
- Color Palette (Primary, Neutral, Semantic + 톤 설명)
- Dark Mode (있는 경우 — 전환 전략, 토큰 매핑)
- Spacing Scale + 여백 철학
- Border Radius Scale + 형태 성격
- Shadow Scale + 깊이 철학
- Border 사용 패턴

**핵심 원칙**: 값 테이블만 나열하지 않고, 각 카테고리마다 **"왜 이 값들이 이런 느낌을 주는지"** 자연어 설명을 반드시 포함.

### 3.3 `02-typography.md` — 타이포그래피 상세

**역할**: 폰트, 사이즈 스케일, 사용 원칙을 정의한다.

**포함 내용:**
- Font Families (Primary, Secondary, Monospace — 각각의 성격 설명)
- Heading Scale (Display ~ H4, 각 레벨의 크기/weight/line-height/용도)
- Body Scale (Body Large ~ Caption, 각 레벨의 크기/weight/용도)
- Typography Principles (제목-본문 대비, 새 텍스트 요소 추가 시 선택 가이드)

### 3.4 `03-component-catalog.md` — 컴포넌트 카탈로그

**역할**: 모든 분석된 컴포넌트의 디자인적 특징을 기록한다.

**포함 내용:**
- Component Overview (총 수, 카테고리별 요약, 계층 구조)
- 카테고리별 컴포넌트 상세:
  - 각 컴포넌트의 디자인적 특징 (자연어 서술)
  - Variants, States
  - 사용 맥락
  - 스타일링 패턴

### 3.5 `04-layout-system.md` — 레이아웃 시스템

**역할**: 페이지의 구조적 틀과 간격 패턴을 정의한다.

**포함 내용:**
- Grid System (타입, 컬럼 수, 거터)
- Container Strategy (max-width, 패딩, 센터링)
- Spacing Rhythm (섹션 간, 컴포넌트 간, 내부 패딩)
- Common Layout Patterns (반복되는 레이아웃 구조 — ASCII 다이어그램 + 설명)

### 3.6 `05-page-structures.md` — 페이지별 구성

**역할**: 각 페이지가 어떤 섹션들로 구성되는지 기록한다.

**포함 내용:**
- 페이지 목록 (이름, 라우트, 목적)
- 각 페이지별 섹션 구성 (순서, 섹션명, 사용 컴포넌트, 레이아웃, 설명)
- 페이지별 디자인 노트 (고유한 디자인 요소, 섹션 간 구분 방법, 콘텐츠 흐름 의도)

### 3.7 `06-responsive-strategy.md` — 반응형 전략

**역할**: 반응형 대응 방식과 각 breakpoint에서의 변화를 기록한다.
(레퍼런스가 반응형을 지원하지 않으면 생략)

**포함 내용:**
- Approach (mobile-first / desktop-first)
- Breakpoint 정의 (이름, 값, 해당 breakpoint에서의 주요 변화)
- Responsive Patterns (네비게이션, 그리드, 히어로, 타이포그래피, 간격, 숨김/표시)

### 3.8 `07-interactions.md` — 인터랙션 & 애니메이션

**역할**: 모션 스타일과 인터랙션 패턴을 기록한다.

**포함 내용:**
- Overall Motion Style (전체 모션 성격)
- Default Transition (duration, easing, 주요 속성)
- Hover Effects (버튼, 카드, 링크 등)
- Page/Section Animations (진입, 스크롤, 로딩 상태)
- Micro-interactions
- Animation Library Usage (사용 라이브러리, 주요 패턴)
- Motion Principles (새 애니메이션 추가 시 따를 규칙)

### 3.9 추가 문서 (동적 생성)

기본 7개 문서 외에, 레퍼런스의 특성에 따라 추가 문서를 생성할 수 있다.

**추가 문서 예시:**
- `dark-mode-strategy.md` — 다크모드 전환이 핵심 특징인 경우
- `form-patterns.md` — 복잡한 폼 패턴이 많은 경우
- `icon-system.md` — 독자적인 아이콘 시스템이 있는 경우
- `data-visualization.md` — 차트/그래프 패턴이 핵심인 경우

**추가 문서 생성 기준:**
- 기본 문서에 포함하기엔 분량이 크고 독립적인 주제
- 레퍼런스의 디자인 에센스에서 중요한 비중을 차지하는 요소

---

## 4. `analysis.json` — 기계 판독용 분석 결과

**역할**: Phase 2 분석 결과를 구조화된 JSON으로 저장. 문서/Prompt 재생성 시 재분석 없이 사용.

**활용:**
- `--docs-only` / `--prompts-only` 옵션으로 부분 재생성
- 향후 분석 결과 비교, 히스토리 추적
- 다른 도구에서 프로그래밍적 활용

---

## 5. 문서 작성 원칙

### 5.1 포맷 규칙
- 마크다운 기반 (GitHub Flavored Markdown)
- Heading `#` ~ `####` (4단계까지)
- 구조화 데이터는 테이블 사용
- 레이아웃 구조는 ASCII 다이어그램 활용
- 코드 블록은 언어 명시

### 5.2 내용 규칙
- **구체적 수치 + 자연어 설명 병행**: 값만 나열하지 않고, "왜", "어떤 느낌"을 함께 설명
- **예시 포함**: 패턴/규칙 설명 시 구체적 적용 예시
- **일관된 용어**: 용어 정의(00-overview.md)에 맞춰 통일

### 5.3 언어
- 문서 기본 언어: **한국어** (사용자 설정으로 변경 가능)
- 코드, 토큰 이름, 기술 용어는 **영어** 유지

### 5.4 Do's & Don'ts 작성 가이드

Do's & Don'ts는 양산 가능성의 핵심 요소이므로 구체적으로 작성한다.

**카테고리별 작성:**
- Color, Typography, Spacing, Component, Motion 각각에 대해 작성

**형식:** 규칙 + 이유
```
✅ Do: 버튼에는 항상 아이콘 + 텍스트 조합 사용 — 아이콘만 단독 사용하지 않는 디자인 철학
✅ Do: 섹션 간 여백은 spacing-scale의 상위 2단계 이상 사용 — "숨 쉬는" 레이아웃 유지
❌ Don't: 그림자 2개 이상 레이어링 금지 — 플랫 미니멀 철학에 위배
❌ Don't: primary 색상을 배경 전체에 사용하지 말 것 — 포인트 색상으로만 활용
```

**금지 표현:**
- "적절하게", "자연스럽게", "필요에 따라" 등 모호한 표현 사용 금지
- 구체적 기준이나 수치로 대체

### 5.5 품질 기준
1. **자기 완결성**: 각 문서는 독립적으로 해당 영역의 디자인을 이해할 수 있어야 함
2. **구체성**: 추상적 설명이 아닌, 구체적 값/패턴/예시를 포함
3. **양산 가능성**: 문서를 읽고 "같은 스타일의 새로운 것"을 만들 수 있어야 함
4. **일관된 포맷**: 모든 프로젝트 분석에 대해 동일한 문서 구조 유지
5. **동적 구성**: 레퍼런스에 해당하지 않는 문서는 생략하고, 필요한 문서는 추가 생성

### 5.6 파일 네이밍
- Design Spec: `{순번 2자리}-{kebab-case 이름}.md` (예: `01-design-tokens.md`)
- 프로젝트 이름: GitHub URL의 repo 이름 또는 로컬 디렉토리 이름
