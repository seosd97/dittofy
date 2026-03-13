# Ditto — Agent Guide

Ditto analyzes frontend repositories to extract design essence and generate AI coding agent prompts.

## Output Philosophy

Ditto extracts **design essence for mass production**, NOT 1:1 source replication.

- **Design tokens, typography, layout** are extracted as reusable specifications
- **Components** are analyzed and documented as a **pattern reference** only — no component implementation prompts are generated
- **Pages** are NOT replicated from the source. Instead, two **showcase pages** (Home, About) are generated to demonstrate the extracted design system in action
- Implementation prompts are **environment-aware** — they adapt to the detected stack, or remain stack-agnostic when no environment is detected

## Output Structure

### Generated Documents (Phase 3)

| File | Aspect | Category | Purpose |
|------|--------|----------|---------|
| `00-overview.md` | (pipeline-level) | core | Project identity and design philosophy |
| `01-design-tokens.md` | tokens | core | Color palette, spacing, radius, shadows, breakpoints |
| `02-typography.md` | typography | core | Font families, type scale, weights, principles |
| `03-component-catalog.md` | components | core | Component pattern reference (not implementation) |
| `04-layout-system.md` | layout | core | Grid, containers, navigation, hierarchy |
| `05-page-structures.md` | pages | dynamic | Extracted page composition patterns |
| `06-responsive-strategy.md` | responsive | dynamic | Breakpoints, adaptation patterns |
| `07-interactions.md` | interactions | dynamic | Animations, transitions, motion style |

- **core** docs are always generated (if analyzer succeeds)
- **dynamic** docs are generated only when sufficient data exists (`canGenerate()` check)

### Generated Prompts (Phase 4)

| Step | Source | Purpose |
|------|--------|---------|
| `setup` | infra | Project setup or design system integration into existing project |
| `design-tokens` | infra | Token definitions using detected styling approach |
| `typography` | infra | Typography system implementation |
| `layout-shell` | layout aspect | Page container, grid, navigation skeleton |
| `showcase-pages` | pages aspect | Home + About pages demonstrating the design system |
| `responsive` | responsive aspect | Breakpoint-based adaptation for showcase pages |
| `interactions` | interactions aspect | Animations, transitions, micro-interactions |

- **Infra steps** (setup, design-tokens, typography) are always included
- **Aspect steps** are conditional — generated only when the aspect has meaningful data
- Steps form a dependency DAG: `setup → design-tokens → typography → layout-shell → showcase-pages → responsive/interactions`

### Environment-Aware Prompt Generation

Before prompt generation, `resolveEnvironment(techStack)` produces an `EnvironmentProfile` shared by all generators:

```
EnvironmentProfile {
  mode: "existing-project" | "greenfield"
  framework: string        // e.g., "Next.js"
  language: string         // e.g., "TypeScript"
  styling: string          // e.g., "Tailwind CSS"
  buildTool: string | null
  uiLibrary: string | null
  tokenStrategy: string    // e.g., "Define tokens in tailwind.config (theme.extend)..."
  summary: string
}
```

| Mode | Detection | Behavior |
|------|-----------|----------|
| `existing-project` | Framework detected with medium/high confidence | Prompts use stack conventions, instruct agent to integrate into existing env |
| `greenfield` | Framework unknown or low confidence | Prompts remain stack-agnostic, agent chooses its own stack |

Token strategy mapping:

| Styling | Token Strategy |
|---------|---------------|
| Tailwind CSS | `tailwind.config` (theme.extend) + CSS variables |
| SCSS / CSS Modules / Plain CSS | CSS custom properties (`:root` variables) |
| Styled Components / Emotion | Theme object via ThemeProvider |
| Vanilla Extract | `createThemeContract` + `createTheme` |

## Tech Stack

- **Runtime**: Node.js ≥ 20, TypeScript 5.7+, ESM-only
- **AI**: AI SDK v6 (`generateText` + `Output.object()` / `Output.json()`). Never use `generateObject` (deprecated).
- **Schema**: Zod 3.24+
- **CLI**: citty, consola, c12
- **Build**: tsdown (ESM, dts)
- **Test**: vitest (`src/**/__tests__/**/*.test.ts`)
- **Lint/Format**: Biome — tabs, no semicolons, double quotes, 100 line width
- **Package Manager**: pnpm

## Path Aliases

All imports use path aliases defined in `tsconfig.json`, `vitest.config.ts`, and `tsdown.config.ts`:

| Alias | Directory |
|-------|-----------|
| `@aspects/*` | `src/aspects/*` |
| `@llm/*` | `src/llm/*` |
| `@source/*` | `src/source/*` |
| `@output/*` | `src/output/*` |
| `@pipeline/*` | `src/pipeline/*` |
| `@cli/*` | `src/cli/*` |
| `@config/*` | `src/config/*` |
| `@defs/*` | `src/types/*` |
| `@utils/*` | `src/utils/*` |

> `@defs` (not `@types`) is used to avoid conflicts with DefinitelyTyped's `@types` scope.

## Architecture — Vertical Slice (Aspect-based)

Each design aspect (tokens, typography, components, layout, pages, responsive, interactions) is a self-contained vertical slice under `src/aspects/<name>/` with three files:

- `schema.ts` — Zod schemas for both analysis output and doc generation output
- `prompts.ts` — Analyzer SystemPromptConfig + `buildXxxDocPrompt()` for doc generation
- `descriptor.ts` — `AspectDescriptor<K>` combining analyzer, doc generator, and planning config

> **Note**: The components aspect runs analysis and generates documentation (pattern reference) but declares no implementation steps (`planSteps: () => []`). Component data is used as reference context for showcase pages.

### Key Types

- **`AspectTypeMap`** (`src/types/aspect-map.ts`): Maps aspect names to their analysis types
- **`AspectDescriptor<K>`** (`src/types/descriptor.ts`): Generic descriptor with `analyzer`, `docGenerator`, and `planning` sections
- **`ASPECT_REGISTRY`** (`src/aspects/registry.ts`): Typed object keyed by `AspectName` for O(1) lookup
- **`defineAspect<K>()`** (`src/aspects/define-aspect.ts`): Factory function inferring `K` from `name`
- **`EnvironmentProfile`** (`src/pipeline/prompt-gen/resolve-environment.ts`): Resolved environment shared across all prompt generators

### Generic Runners

Two runners replace all per-aspect boilerplate:

- **`runAnalyzer`** (`src/llm/runners/analyzer.ts`): Runs any aspect's analysis using its descriptor
- **`runDocGenerator`** (`src/llm/runners/generator.ts`): Generates documentation for any aspect

## Source Layout

```
src/
├── aspects/            # Vertical slices (tokens, typography, components, ...)
│   ├── define-aspect.ts
│   ├── registry.ts
│   └── <name>/         # schema.ts, prompts.ts, descriptor.ts
├── cli/                # CLI entry point and commands
├── config/             # Consolidated constants (analysis, extraction, token-estimation)
├── llm/
│   ├── core/           # client.ts, provider.ts, retry.ts (LLM infrastructure)
│   ├── runners/        # analyzer.ts, generator.ts (generic runners)
│   ├── prompts/        # Prompt templates (analyzers, generators, system)
│   ├── schemas/        # Shared LLM schemas
│   ├── context.ts      # Context builder (accepts ContextConfig per aspect)
│   ├── presets.ts      # TASK_PRESETS + PROVIDER_PROFILES
│   └── usage.ts        # Token usage tracking
├── output/             # docs.ts, prompts.ts, markdown.ts (writers)
├── pipeline/
│   ├── orchestrator.ts # Registry-driven pipeline (health → extract → analyze → docs → prompts)
│   ├── essence.ts      # Cross-aspect essence synthesis
│   ├── context.ts      # Pipeline context
│   ├── health-check.ts
│   ├── planners/       # docs.ts, steps.ts (2-pass step planner)
│   └── prompt-gen/     # Prompt generation phase
│       ├── index.ts            # Orchestrates step generation
│       ├── resolve-environment.ts  # EnvironmentProfile resolution
│       ├── context-injector.ts     # Builds per-step context from analysis + docs
│       └── generators/         # Per-step-type prompt generators
├── source/             # Extraction: file-scanner, code-extractor, config-extractor, tech-stack-detector, repo-resolver
├── types/              # Type definitions (imported as @defs/*)
└── utils/              # fs.ts, logger.ts, etc.
```

## Pipeline Flow

1. **Health Check** — Validates repository before processing
2. **Phase 1: Extraction** — Scans files, extracts code chunks, configs, and tech stack
3. **Phase 2: Analysis** — Runs 7 aspect analyzers concurrently (limit: 3), then synthesizes design essence
4. **Phase 3: Documentation** — Generates markdown docs per aspect (core + dynamic)
5. **Phase 4: Prompt Generation**:
   - `resolveEnvironment()` — Derives `EnvironmentProfile` from `TechStack`
   - `planSteps()` — 2-pass step planner with symbolic dependency resolution
   - For each step: `injectContext()` → `generator(analysis, context, env)` → LLM call → `assemblePromptStep()`

## Common Commands

```bash
pnpm dev <source>        # Run CLI in dev mode
pnpm build               # Build with tsdown
pnpm test:run            # Run all tests once
pnpm typecheck           # tsc --noEmit
pnpm lint                # Biome check
pnpm lint:fix            # Biome auto-fix
```

## Coding Conventions

- Use path aliases for all imports (never relative paths crossing module boundaries)
- All imports must use `.js` extension suffix (ESM resolution)
- Biome handles import sorting — run `pnpm lint:fix` after adding imports
- Prefer `as const` for constant objects
- Use `type` imports for type-only references
- Tests live in `__tests__/` directories co-located with source
- Korean is preferred for docs and user-facing communication
