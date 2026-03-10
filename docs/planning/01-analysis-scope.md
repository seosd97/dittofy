# 01. Analysis Scope — 무엇을 분석하는가

## 1. 분석의 목적

> 레퍼런스 디자인의 **핵심 에센스**를 파악하여,
> 같은 스타일의 새로운 페이지/컴포넌트를 **양산할 수 있는 수준**의 이해를 도출한다.

1:1 복제를 위한 정밀 측정이 아니라, "이 디자인은 왜 이런 느낌인가"를 구조적으로 파악하는 것이 목표.

---

## 2. 분석 대상 (Input)

### 2.1 v1 지원
| Input 유형 | 설명 | 예시 |
|-----------|------|------|
| 로컬 디렉토리 | FE 프로젝트가 있는 로컬 경로 | `./my-project` |
| GitHub URL | 공개 FE 레포지토리 URL | `https://github.com/user/repo` |

### 2.2 v1 이후 확장 예정
- Figma URL
- Framer URL
- 일반 웹사이트 URL

### 2.3 입력 제약
- 단일 레퍼런스만 지원 (다중 조합 불가)
- FE 프로젝트여야 함 (백엔드 전용 레포는 비대상)
- monorepo인 경우 FE 패키지를 특정할 수 있어야 함

---

## 3. 분석 항목

### 3.1 기술 스택 감지

분석의 첫 단계로, 레퍼런스가 어떤 기술 스택을 사용하는지 파악한다.
이후 분석 전략과 Prompt 생성의 타겟 스택을 결정하는 데 사용.

**감지 대상:**
- 프레임워크 (React, Next.js, Vite, Astro, Svelte, Vue 등)
- 스타일링 방식 (Tailwind, CSS Modules, Styled Components, SCSS 등)
- UI 라이브러리 (shadcn/ui, Radix, MUI, Ant Design, Headless UI 등)
- 애니메이션 라이브러리 (Framer Motion, GSAP, React Spring, CSS only)
- 아이콘 시스템 (lucide, heroicons, react-icons, SVG 직접 사용 등)
- 폰트 로딩 방식 (next/font, Google Fonts, 로컬 폰트 등)

### 3.2 디자인 토큰 체계

디자인 시스템의 기본 단위 값들을 추출하고 패턴을 파악한다.

| 토큰 카테고리 | 분석 내용 | 에센스 관점의 핵심 |
|-------------|----------|------------------|
| **Color** | 팔레트, 의미별 매핑, 다크모드 | 컬러 톤/무드, 색상 사용 비율 (배경 지배색, 포인트색, 텍스트색 비중) |
| **Typography** | 폰트 패밀리, 사이즈 스케일, weight 체계 | 타이포 성격 및 감정 기여도 (폰트의 시각적 인상, 제목-본문 대비 효과) |
| **Spacing** | 간격 스케일, 사용 패턴 | 여백 밀도 (compact / normal / spacious) |
| **Border Radius** | radius 스케일 | 형태 성격 ("부드러운 곡선" vs "날카로운 각") |
| **Shadow** | 그림자 스케일 | 깊이 스타일 ("플랫" vs "미니멀 쉐도우" vs "뚜렷한 입체") |
| **Border** | 보더 사용 패턴, 색상, 두께 | 구분 방식 |
| **Opacity** | 투명도 스케일 | — |
| **Z-Index** | z-index 체계 | — |

**분석 깊이:**
- 명시적으로 정의된 토큰 (tailwind.config, CSS Variables, theme 객체) → 직접 추출
- 하드코딩된 값만 있는 경우 → 반복 패턴에서 토큰 체계를 추론
- 모든 경우 → 토큰의 "톤/무드/성격"을 자연어로 설명

### 3.3 컴포넌트 구조 & 패턴

레퍼런스에 존재하는 UI 컴포넌트를 파악하고, 각각의 디자인적 특징을 분석한다.

**분석 항목:**
- 컴포넌트 목록 & 카테고리 분류
- 각 컴포넌트의 디자인적 특징 (자연어 서술)
- Variant (크기, 색상, 스타일 변형)
- 상태 (hover, active, disabled, loading 등)
- 컴포넌트 간 조합 관계 (어떤 컴포넌트가 어떤 하위 컴포넌트를 사용하는지)
- 사용처 (어떤 페이지/섹션에서 사용되는지)
- 사용 맥락 (예: 'Primary CTA에만 사용', '카드 내부에서만 사용' 등)
- 시각적 무게 (light / medium / heavy)
- 상태 전이 흐름 (주요 상태: default → hover → loading → success 등)

**컴포넌트 카테고리:**
| 카테고리 | 예시 | 설명 |
|---------|------|------|
| Primitive | Button, Input, Badge, Avatar | 최소 단위 UI 요소 |
| Composite | Card, Dialog, Dropdown, Tabs | 여러 primitive를 조합한 복합 요소 |
| Layout | Header, Footer, Sidebar, Container | 페이지 구조를 잡는 틀 |
| Page Section | Hero, Features, Pricing, CTA | 페이지 내 독립적 섹션 |
| Navigation | Nav, Breadcrumb, Pagination | 네비게이션 관련 |
| Data Display | Table, List, Chart | 데이터 표시 |
| Feedback | Toast, Alert, Skeleton, Spinner | 사용자 피드백 |
| Form | Form, FormField, Select, Checkbox | 입력 관련 |

### 3.4 레이아웃 시스템

페이지의 구조적 틀을 분석한다.

**분석 항목:**
- 그리드 시스템 (CSS Grid, Flexbox, 혼합)
- 컨테이너 전략 (max-width, fluid, hybrid)
- 간격 리듬 (섹션 간, 컴포넌트 간, 내부 패딩 패턴)
- 반복되는 레이아웃 패턴 (2-column hero, card grid, centered CTA 등)
- 시각적 계층 구조 (시선 흐름, 정보 우선순위, 강조 요소 배치 패턴)

### 3.5 페이지 구성

각 페이지가 어떤 섹션들로 구성되는지 분석한다.

**분석 항목:**
- 페이지 목록 & 라우트
- 각 페이지의 목적/역할
- 페이지별 섹션 구성 (순서, 각 섹션의 역할)
- 섹션 간 시각적 구분 방법 (배경색 교차, 구분선 등)
- 각 페이지만의 고유한 디자인 요소

### 3.6 반응형 전략

레퍼런스의 반응형 대응 수준에 맞춰 분석한다. 레퍼런스가 반응형을 지원하지 않으면 이 항목은 생략.

**분석 항목:**
- 접근 방식 (mobile-first / desktop-first)
- breakpoint 정의 및 각 breakpoint에서의 주요 변화
- 반응형 패턴 (네비게이션 변화, 그리드 축소, 스택 전환, 요소 숨김/표시)
- 반응형 타이포그래피 (clamp, 뷰포트 기반 스케일링)
- 반응형 간격 (breakpoint별 패딩/마진 변화)

### 3.7 인터랙션 & 애니메이션

사용자 인터랙션과 시각적 동작을 분석한다.

**분석 항목:**
- 전체 모션 스타일 ("절제된" vs "화려한" vs "부드러운")
- 기본 트랜지션 패턴 (duration, easing)
- hover 효과 (버튼, 카드, 링크 등)
- 페이지/섹션 진입 애니메이션
- 스크롤 기반 동작 (스크롤 애니메이션, 패럴렉스, sticky 요소)
- 마이크로인터랙션 (토글, 체크, 툴팁, 아코디언 등)
- 로딩 상태 (스켈레톤, 스피너 등)
- 사용 라이브러리의 활용 패턴

### 3.8 디자인 에센스 종합

위 모든 분석 결과를 종합하여 디자인의 핵심 정체성을 도출한다.
이 항목이 전체 분석의 **최종 산출물이자 가장 핵심적인 결과**.

**도출 항목:**
- 디자인 정체성 요약 (한 줄)
- 디자인 원칙 (이 디자인이 따르는 규칙들)
- 무드 키워드
- 스타일 카테고리 (복수 선택 가능 — 참고 목록: Modern SaaS, Corporate/Enterprise, Minimalist, Playful/Creative, Editorial/Magazine, Dashboard/Data, E-commerce, Documentation, Marketing/Landing 등. 목록에 없는 카테고리도 자유 서술 가능)
- 시각적 특징 요약 (color mood, typography character, spacing character, shape, depth, motion)
- Do's & Don'ts (이 스타일을 양산할 때 지켜야 할 것 / 피해야 할 것)
- 비슷한 스타일의 레퍼런스

---

## 4. 분석하지 않는 것

기획 목적에 맞지 않거나 v1 범위를 벗어나는 항목:

| 항목 | 이유 |
|------|------|
| 비즈니스 로직 / 데이터 흐름 | 디자인 분석 범위가 아님 |
| API 연동, 상태 관리 | 디자인 분석 범위가 아님 |
| 테스트 코드 | 디자인 분석 범위가 아님 |
| 이미지/일러스트 콘텐츠 | 비주얼 에셋의 "스타일" (플랫, 라인 기반 등)은 서술하되, 콘텐츠 자체는 분석 불가 |
| SEO, 성능 최적화 | 디자인 에센스와 무관 |
| 접근성 (a11y) 상세 | Prompt에서 기본적인 a11y는 포함하되, 레퍼런스의 a11y 수준 분석은 범위 밖 |

---

## 5. 분석 깊이 기준

### "에센스"와 "디테일"의 경계

이 시스템의 분석 깊이는 **"양산 가능성"**에 의해 결정된다:

```
이 정보가 없으면 같은 스타일의 새 컴포넌트를 만들 수 없다 → 반드시 분석
이 정보가 있으면 더 정확해지지만 없어도 만들 수 있다 → 분석하되 우선순위 낮음
이 정보는 1:1 복제에만 필요하다 → 분석하지 않음
```

**예시:**
- "primary color가 네이비 계열이다" → 반드시 분석 (양산에 필수)
- "primary color가 정확히 #1E40AF이다" → 분석하되 참고 수준 (정확한 값보다 톤이 중요)
- "이 버튼의 padding이 정확히 12px 24px이다" → 분석하지 않음 (양산 시 비슷한 수준이면 됨)
- "이 디자인은 버튼에 넉넉한 가로 패딩을 사용한다" → 반드시 분석 (양산에 필수)

---

## 6. 스타일링 방식 지원 티어

| 티어 | 스타일링 방식 | 지원 수준 |
|------|------------|----------|
| **Tier 1** (완전) | Tailwind CSS, CSS Variables | 직접 토큰 추출 + LLM 분석 |
| **Tier 2** (부분) | CSS Modules, SCSS, Styled Components | LLM 기반 패턴 분석 |
| **Tier 3** (제한) | CSS-in-JS 런타임, 기타 | 최선 노력, 한계 명시 |

Tier 2~3의 경우 토큰 추출 정확도가 떨어질 수 있으며, LLM이 코드 패턴에서 최대한 유추하여 보완한다.

**Tier별 예상 정확도 (M1 실측 후 조정):**
- **Tier 1**: Precision 80%+, Recall 70%+
- **Tier 2**: Precision 60~80%, Recall 50~70%
- **Tier 3**: 정량 목표 없음, "최선 노력" (결과에 Tier 명시)

---

## 7. Pre-analysis Health Check

Phase 1(Extraction) 완료 후, Phase 2(Analysis) 진입 전에 레포의 분석 가능성을 사전 점검한다.

### 체크 항목
- FE 프로젝트 여부 (package.json, FE 프레임워크 의존성 존재)
- 스타일링 파일 존재 (CSS, SCSS, Tailwind config 등)
- 컴포넌트 파일 존재 (JSX/TSX 파일)

### 결과
| 결과 | 조건 | 동작 |
|------|------|------|
| **pass** | 모든 체크 항목 충족 | 정상 진행 |
| **warn** | 일부 항목 미흡 (예: 스타일링이 인라인만 존재) | 경고 표시 후 계속 진행 |
| **fail** | FE 프로젝트가 아니거나, 스타일링 코드가 전혀 없음 | 분석 중단 + 이유 표시 |

---

## 8. 분석의 한계 & Graceful Degradation

### 8.1 코드 분석의 근본적 한계
- 코드만으로는 렌더링된 시각적 결과를 직접 확인할 수 없음
- CSS-in-JS 런타임 결정 스타일, 동적 스타일은 정적 분석으로 파악 어려움
- 이미지/일러스트의 시각적 스타일은 코드에서 제한적으로만 파악 가능

v1은 코드 분석 전용으로 진행하며, M1 완료 시 벤치마크 레포로 품질을 검증한다.
품질이 불충분할 경우 v1.x에서 스크린샷 기반 보조 분석을 추가 검토한다.

### 8.2 Graceful Degradation 전략
정보가 부족한 항목에 대해 "분석 불가"로 처리하지 않고, LLM이 최대한 유추하여 보완한다.

- 각 분석 항목에 **confidence level** 표시:
  - **high**: 명시적 정의가 존재하여 높은 정확도로 추출
  - **medium**: 코드 패턴에서 유추, 대체로 신뢰 가능
  - **low**: 정보 부족으로 LLM이 추론, 수동 검증 권장
- 아예 분석이 불가능한 경우에만 "분석 불가" 표기

**Confidence Level의 산출물 반영:**
- **디자인 스펙 문서**: 각 섹션에 confidence 표시. low인 경우 "⚠️ 추론 기반 — 검증 권장" 주석 포함
- **Prompt 생성**: high/medium 항목만 구현 지시에 포함. low 항목은 "선택사항"으로 표시하거나 제외
- **analysis.json**: 모든 분석 항목에 confidence 필드 포함
- 최소 요건: 스타일링 코드가 존재하는 FE 프로젝트
