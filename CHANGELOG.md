# Changelog

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
