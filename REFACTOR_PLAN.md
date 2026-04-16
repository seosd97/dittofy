# Ditto — Refactoring Plan

> **COMPLETED** — All 6 phases (+ residual fixes, UX improvements, Korean comment cleanup) are done.
> 323 tests passing, 0 production `any` types, all Korean code comments translated to English.
> See commit history for details.

## Dependency Diagram

```
Phase 0 (Security/Correctness)   ← Prerequisite for all fixes
  ├─ 0.1 API Key masking
  ├─ 0.2 wave-executor race condition
  └─ 0.3 repo-resolver URL validation
         │
Phase 1 (Layer Boundaries)      ← Restore domain purity
  ├─ 1.1 extraction-constants → domain
  ├─ 1.2 Remove logger from domain (callback injection)
  ├─ 1.3 PresetName type → domain
  └─ 1.4 ExtractionOutput type decomposition
         │
Phase 2 (Type/Schema)           ← Zod as single source of truth
  ├─ 2.1 Shared schemas → schema-utils.ts
  ├─ 2.2 AnalysisResult Zod-derived
  └─ 2.3 AspectDescriptor.merge type safety
         │
Phase 3 (Code Quality)           ← Independent (parallelizable)
  ├─ 3.1 silent catch → logger.debug
  ├─ 3.2 normalizeNullArrays precision
  ├─ 3.3 workspace-detector iteration limit
  ├─ 3.4 validateAnalysisPlan immutability
  ├─ 3.5 resolveFiles immutability
  └─ 3.6 analyze.ts monorepo dedup
         │
Phase 4 (Large File Split)      ← SRP restoration (parallelizable)
  ├─ 4.1 orchestrator.ts → validation.ts
  ├─ 4.2 analysis-renderer.ts → renderers/
  ├─ 4.3 design-reference-builders.ts → parameterized
  └─ 4.4 resolve-structure.ts → config-driven
         │
Phase 5 (Tests)                 ← After Phase 0-4
  ├─ 5.1 orchestrator.test.ts mock reduction
  ├─ 5.2 wave-executor concurrency tests
  └─ 5.3 extraction edge cases
         │
Phase 6 (Dedup + Misc)          ← Independent (parallelizable)
  ├─ 6.1 mdTable/formatSize/consistency dedup
  ├─ 6.2 Magic number constants
  ├─ 6.3 any type removal, ESM exports
  └─ 6.4 Other Medium/Low issues
```

---

## Phase 0: Security/Correctness (parallel)

### Step 0.1 — API Key Masking 🔴
- **File**: `src/infra/llm/client.ts`
- **Change**: Add `maskSensitive()` function for debug logging. Mask `sk-***`, `Bearer ***`, `key-***` patterns.
- **Verify**: `pnpm test:run`

### Step 0.2 — wave-executor Race Condition 🔴
- **File**: `src/app/pipeline/wave-executor.ts`
- **Change**: Fix `createConcurrencyLimiter` — add `active++` after queue wake, or rewrite as Semaphore.
- **Verify**: Concurrency test (limit=2, 10 tasks → max 2 concurrent)

### Step 0.3 — repo-resolver URL Validation 🟠
- **File**: `src/infra/source/repo-resolver.ts`
- **Change**: Add regex validation for GitHub URLs (`github:user/repo` or `https://github.com/user/repo`).
- **Verify**: Edge case tests (empty, malformed, deep paths)

---

## Phase 1: Layer Boundaries (parallel)

### Step 1.1 — extraction-constants Migration 🟠
- **Files**: `src/domain/constants/index.ts`, `src/infra/source/extraction-constants.ts`
- **Change**: Move `EXTRACTION_LIMITS`, `IGNORE_PATTERNS`, etc. to `domain/constants/`. Infra imports from domain.
- **Verify**: `pnpm typecheck && pnpm test:run`

### Step 1.2 — Remove Logger from Domain 🟠
- **Files**: `domain/analysis/reconciliation.ts`, `file-resolver.ts`, `rendering/resolve-environment.ts`
- **Change**: Replace `import { logger }` with `log?: (msg: string) => void` callback injection.
- **Verify**: `pnpm typecheck && pnpm test:run`

### Step 1.3 — PresetName Type Migration 🟡
- **Files**: `domain/types/descriptor.ts`, `infra/llm/presets.ts`
- **Change**: Move `PresetName` type to `domain/types/`.
- **Verify**: `pnpm typecheck && pnpm test:run`

### Step 1.4 — ExtractionOutput Type Decomposition 🟡
- **Files**: `domain/rendering/tree-renderer.ts`, `app/pipeline/orchestrator.ts`
- **Change**: Change `renderProjectMeta` parameter from `ExtractionOutput` to a domain interface with only needed fields.
- **Verify**: `pnpm typecheck && pnpm test:run`

---

## Phase 2: Type/Schema Unification (parallel)

### Step 2.1 — Shared Schema Consolidation 🟡
- **Files**: `domain/types/schema-utils.ts`, `domain/aspects/*/schema.ts`
- **Change**: Move `tokenValueSchema` and similar shared schemas to `schema-utils.ts`.
- **Verify**: `pnpm typecheck && pnpm test:run`

### Step 2.2 — AnalysisResult Zod Derivation 🟠
- **Files**: `domain/types/analysis.ts` (340 lines), `domain/aspects/*/schema.ts`
- **Change**: Derive types via `z.infer<typeof schema>`. Auto-compose `AspectTypeMap` from registry. Remove manual interfaces.
- **Verify**: `pnpm typecheck && pnpm test:run && pnpm build`

### Step 2.3 — merge Type Safety 🟠
- **File**: `domain/types/descriptor.ts`
- **Change**: `merge: (chunks: unknown[])` → generic typed signature.
- **Verify**: `pnpm typecheck`

---

## Phase 3: Code Quality (parallel)

### Step 3.1 — Silent Catch Fix 🟠
- **Files**: `infra/config/loader.ts`, `infra/source/file-scanner.ts`, `infra/source/workspace-detector.ts`
- **Change**: Add `logger.debug()` to all empty catch blocks.
- **Verify**: `pnpm test:run`

### Step 3.2 — normalizeNullArrays Precision 🟠
- **File**: `src/infra/llm/client.ts`
- **Change**: Only transform null→[] for Zod schema array fields, not all nulls.
- **Verify**: Test `defaultTheme: null` preservation

### Step 3.3 — workspace-detector Iteration Limit 🟠
- **File**: `src/infra/source/workspace-detector.ts`
- **Change**: Add `MAX_WALKUP = 20` constant.
- **Verify**: Deep nesting test

### Step 3.4 — validateAnalysisPlan Immutability 🟡
- **File**: `domain/analysis/plan-parser.ts`
- **Change**: Return new object instead of mutating input.
- **Verify**: `pnpm test:run`

### Step 3.5 — resolveFiles Immutability 🟡
- **File**: `domain/analysis/file-resolver.ts`
- **Change**: Return new fileSelection instead of mutating plan.
- **Verify**: `pnpm test:run`

### Step 3.6 — Monorepo Logic Dedup 🟠
- **Files**: `app/cli/commands/analyze.ts`, `app/pipeline/orchestrator.ts`
- **Change**: Extract common `prepareExtraction()` function.
- **Verify**: `pnpm test:run`

---

## Phase 4: Large File Split (parallel)

### Step 4.1 — orchestrator.ts Split 🔴 (601 lines)
- **File**: `app/pipeline/orchestrator.ts`
- **Change**: Extract `validation.ts` (validateAnalysisConfig, validateGenerateInput). Target: ≤300 lines.
- **Verify**: `pnpm typecheck && pnpm test:run`

### Step 4.2 — analysis-renderer.ts Split 🟠 (612 lines)
- **File**: `domain/rendering/analysis-renderer.ts`
- **Change**: Extract per-aspect renderers to separate files. Move shared helpers to `format-utils.ts`.
- **Verify**: `pnpm typecheck && pnpm test:run`

### Step 4.3 — design-reference-builders.ts Dedup 🟠 (451 lines)
- **File**: `domain/rendering/design-reference-builders.ts`
- **Change**: Merge `buildColorReference`/`buildColorReferenceCompact` via `{ compact? }` parameter. Same for layout.
- **Verify**: `pnpm typecheck && pnpm test:run`

### Step 4.4 — resolve-structure.ts Refactor 🟠 (448 lines)
- **File**: `domain/rendering/resolve-structure.ts`
- **Change**: Replace switch with data-driven config. Extract `buildCommonStructure()`.
- **Verify**: `pnpm typecheck && pnpm test:run`

---

## Phase 5: Tests

### Step 5.1 — orchestrator.test.ts Mock Reduction 🔴
- **File**: `app/pipeline/__tests__/orchestrator.test.ts`
- **Change**: Write independent tests for extracted modules. Minimize mocks.
- **Verify**: `pnpm test:run`

### Step 5.2 — wave-executor Concurrency Tests 🟠
- **File**: `app/pipeline/__tests__/wave-executor.test.ts` (new/extend)
- **Change**: Unit test for `createConcurrencyLimiter`. Integration test for `executeWaves`.
- **Verify**: `pnpm test:run`

### Step 5.3 — Extraction Edge Cases 🟠
- **File**: `infra/source/__tests__/extraction.test.ts`
- **Change**: Add empty dir, symlinks, deep nesting, large files.
- **Verify**: `pnpm test:run`

---

## Phase 6: Dedup + Misc (parallel)

| Step | Change | Files |
|------|--------|-------|
| 6.1 | mdTable, formatSize, consistency dedup → `format-utils.ts` | `rendering/*` |
| 6.2 | Magic number constants (viability 0.4/0.7, tier, designTokens) | `analysis/*`, `rendering/*` |
| 6.3 | `any` type removal → `Record<string, unknown>` | `workspace-detector.ts`, `loader.ts` |
| 6.4 | ESM exports completeness | `package.json` |
| 6.5 | Cleanup order documentation | `orchestrator.ts` |

---

## Verification

After each phase:
```bash
pnpm typecheck   # Type check
pnpm lint        # Biome check
pnpm test:run    # All tests
pnpm build       # Build
```

Final:
```bash
pnpm check       # typecheck + lint + test + build
```
