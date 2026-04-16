# Changelog

## 0.2.0

### Minor Changes

- 58f5b11: Code quality refactoring, UX improvements, and `ditto init` command

  **Code quality:**

  - Remove all `any` types and unsafe casts from production code (0 remaining)
  - Translate all Korean code comments to English
  - Extract magic numbers to named constants
  - Add runtime validation for chunked analysis merges
  - Fix Zod schema unwrapping (ZodPipeline, ZodReadonly, ZodEffects, ZodLazy)
  - Split large files: analysis-renderer → renderers/, resolve-structure → config-driven
  - Add plan-parser dedup and chunk validation with logging
  - Expand test coverage (323 tests, 29 files)

  **UX improvements:**

  - `ditto init`: interactive first-time setup (provider selection + API key input)
  - Progress bar with ETA calculation and aspect-level tracking
  - Detailed result report (per-aspect success/failure, token usage breakdown, output file list)
  - Workspace preservation on failure with resume guidance

## 0.1.0

### Minor Changes

- bfdf87c: Initial release of dittofy — analyze frontend repositories to extract design essence and generate AI coding agent prompts.

  Features:

  - 7-aspect design system analysis (tokens, typography, components, layout, pages, responsive, interactions)
  - LLM-driven analysis planning with wave-based parallel execution
  - Template-based document and prompt generation (no LLM cost)
  - Monorepo support (pnpm workspaces)
  - Multiple LLM providers (OpenAI, Anthropic, ZAI/GLM)
  - --dry-run, --debug, --include, --analyze-only modes
  - ~/.ditto/settings.json configuration

- initial

## 0.1.0 (2025-03-11)

Initial release.

### Features

- **4-Phase Pipeline**: Extraction → Analysis → Documentation → Prompt Generation
- **3 LLM Providers**: OpenAI, Anthropic, Zhipu (GLM-5)
- **7 Design Analyzers**: tokens, typography, components, layout, pages, responsive, interactions
- **Design Spec Generation**: Up to 8 markdown documents describing the design system
- **Implementation Prompts**: Step-by-step AI coding agent prompts with inline design specs
- **Monorepo Support**: Auto-detect FE packages in monorepos (npm/pnpm workspaces)
- **GitHub URL Support**: Analyze remote repos directly via `ditto analyze <github-url>`
- **Structured Output**: JSON analysis + markdown docs + implementation prompts
- **Graceful Degradation**: Partial results when individual analyzers fail
- **CJK-aware Token Estimation**: Accurate budget allocation for Korean/Chinese/Japanese projects
- **Configuration**: `ditto.config.ts` + `.env` auto-loading + CLI flags
