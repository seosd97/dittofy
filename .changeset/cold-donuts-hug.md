---
"dittofy": minor
---

Code quality refactoring, UX improvements, and `ditto init` command

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
