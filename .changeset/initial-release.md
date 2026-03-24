---
"dittofy": minor
---

Initial release of dittofy — analyze frontend repositories to extract design essence and generate AI coding agent prompts.

Features:
- 7-aspect design system analysis (tokens, typography, components, layout, pages, responsive, interactions)
- LLM-driven analysis planning with wave-based parallel execution
- Template-based document and prompt generation (no LLM cost)
- Monorepo support (pnpm workspaces)
- Multiple LLM providers (OpenAI, Anthropic, ZAI/GLM)
- --dry-run, --debug, --include, --analyze-only modes
- ~/.ditto/settings.json configuration
