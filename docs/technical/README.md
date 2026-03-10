# Technical Documents — 구현 상세 설계

이 디렉토리에는 Ditto의 기술적 구현 상세가 포함됩니다.
기획 문서(`../planning/`)에서 정의한 "무엇을, 왜"에 대한 "어떻게"를 다룹니다.

## 문서 목록

| 문서 | 설명 |
|------|------|
| [00-tech-decisions.md](./00-tech-decisions.md) | 기술 스택 결정 기록 (런타임, 프레임워크, 의존성) |
| [01-architecture.md](./01-architecture.md) | 시스템 아키텍처 (디렉토리 구조, 모듈 의존성, 데이터 흐름, 에러/로깅) |
| [02-cli-design.md](./02-cli-design.md) | CLI 설계 (명령어, 옵션, 설정, UX, 에러 메시지) |
| [03-type-definitions.md](./03-type-definitions.md) | 핵심 타입 정의 (Pipeline, Phase 1~4 입출력, CLI, 공통 타입) |
| [04-pipeline-design.md](./04-pipeline-design.md) | 4-Phase 파이프라인 상세 설계 (각 Phase의 로직, 분석기, 생성기) |
| [05-llm-integration.md](./05-llm-integration.md) | LLM 통합 설계 (클라이언트, 프롬프트, 컨텍스트 관리, 비용 최적화) |
| [06-implementation-tasks.md](./06-implementation-tasks.md) | 마일스톤별 구현 태스크 (M0~M3, 51개 태스크, 의존성 그래프) |

## 읽기 순서

```
00-tech-decisions  ← 전제 조건 (먼저 확인)
       │
       ▼
03-type-definitions  ← 모든 모듈의 계약
       │
       ▼
01-architecture  ← 전체 구조의 뼈대
       │
  ┌────┼────────────┐
  ▼    ▼            ▼
02-cli 05-llm    04-pipeline
                    │
                    ▼
            06-implementation-tasks
```
