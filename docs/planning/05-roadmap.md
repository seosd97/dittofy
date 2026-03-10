# 05. Roadmap — 마일스톤 & 확장 계획

## 1. 마일스톤 개요

```
M0: Foundation ────▶ M1: Core Analysis ────▶ M2: Doc & Prompt Gen ────▶ M3: Polish & Publish
(프로젝트 기반)       (분석 엔진 핵심)         (문서/Prompt 생성)          (안정화, npm 배포)
```

---

## 2. 마일스톤 상세

### M0: Foundation (프로젝트 기반)

**목표**: CLI 도구의 골격을 잡고 4-Phase 파이프라인의 기본 흐름을 구성한다.

**범위**:
- 프로젝트 초기 설정 (TypeScript, ESLint, 테스트 등)
- CLI 명령어 프레임워크 (`ditto analyze`, `ditto config`)
- 4-Phase 순차 파이프라인 오케스트레이터
- LLM 클라이언트 추상화 (Claude API 기본)
- 설정 시스템 (API 키 관리 등)

**완료 기준**:
- `ditto analyze ./test-repo` 실행 시 파이프라인이 순차 실행 (각 Phase는 stub)
- LLM 클라이언트로 테스트 호출 성공
- `ditto config` 설정 관리 동작

### M1: Core Analysis (분석 엔진)

**목표**: Phase 1 (Extraction)과 Phase 2 (Analysis)를 구현한다.

**범위**:
- Repo Resolver (로컬 경로 / GitHub URL → 분석 가능 상태 확보)
- File Scanner (파일 트리 스캔, FE 관련 파일 필터링)
- Code/Config Extractor (코드 추출, 설정 추출)
- Tech Stack Detector (프레임워크, 스타일링, UI 라이브러리 감지)
- 각 분석기 구현 (토큰, 컴포넌트, 레이아웃, 페이지, 반응형, 인터랙션)
- Essence Synthesizer (전체 종합)

**완료 기준**:
- 실제 FE 레포에 대해 `ditto analyze` 실행 시 구조화된 분석 결과 출력
- `analysis.json` 올바르게 생성
- 분석 결과가 레퍼런스의 실제 디자인을 합리적으로 반영

### M2: Document & Prompt Generation (문서/Prompt 생성)

**목표**: Phase 3 (Documentation)과 Phase 4 (Prompt Generation)을 구현한다.

**범위**:
- 문서 생성기 (7개 design-spec 문서)
- Step Planner (분석 결과 복잡도에 따른 단계 계획)
- Prompt 생성기 (단계별 구현 Prompt)
- Context Injection (각 Prompt에 필요한 디자인 정보 선별 발췌)
- 파일 시스템 출력

**완료 기준**:
- 실제 레포에 대해 `design-spec/` + `prompts/` 디렉토리 생성됨
- 생성된 문서로 디자인을 이해할 수 있음
- 생성된 Prompt를 AI Agent에게 전달하면 프로젝트 구현 가능 (기본 수준)

### M3: Polish & Publish (안정화, 배포)

**목표**: 안정성을 높이고 npm에 배포한다.

**범위**:
- 에러 처리 강화 (엣지 케이스, graceful degradation)
- CLI UX 개선 (진행 상태 표시, 분석 요약 출력)
- 캐싱 (`--docs-only`, `--prompts-only` 옵션)
- 다양한 레포에서 테스트 & 품질 개선
- npm 배포 준비 및 배포

**완료 기준**:
- `npx ditto analyze <source>` 정상 동작
- 5개 이상 다양한 레포에서 합리적 품질의 산출물 생성
- 에러 시 명확한 메시지 표시

---

## 3. v1 이후 확장 계획

### v1.x (안정화 이후)
- 웹사이트 URL 분석 (Puppeteer/Playwright 기반)
- Figma URL 분석 (Figma API)
- Framer URL 분석
- 분석 결과 visual diff 도구
- 다국어 문서 지원
- Scaffold 자동 생성 (`--scaffold` — Step 1~2 대체)
- 비용 관리 기능 (`--dry-run`, `--max-files`, `--max-components`)
- 스크린샷 기반 보조 분석 (코드 분석 품질 보완)

### v2.x (기능 확장)
- 다중 레퍼런스 조합 (여러 스타일 블렌딩)
- 웹 UI
- AI Agent 직접 실행 통합 (Prompt 바로 실행)
- 품질 자동 검증 (생성 → 구현 → 스크린샷 → 비교 자동화)

---

## 4. 리스크

| 리스크 | 영향도 | 대응 |
|--------|--------|------|
| LLM 비용 과다 | 높음 | 캐싱, 분석 범위 제한, 작은 모델 옵션 |
| LLM 분석 품질 불안정 | 높음 | structured output, 낮은 temperature, 재시도 |
| 대형 레포 처리 어려움 | 중간 | 관련도 필터링, 분할 분석 |
| 특이한 스타일링 방식 | 중간 | 주요 방식 우선 지원, 미지원 경고 |
| 코드만으로 에센스 파악 한계 | 높음 | M1 PoC 검증, v1.x 스크린샷 보조 분석 검토 |
