# Changelog

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
