# Ditto — Agent Guide

Ditto analyzes frontend repositories to extract design essence and generate AI coding agent prompts.

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

- `schema.ts` — Zod schema for the analysis output
- `prompts.ts` — System prompt configuration
- `descriptor.ts` — `AspectDescriptor<K>` combining analyzer, doc generator, and planning config

### Key Types

- **`AspectTypeMap`** (`src/types/aspect-map.ts`): Maps aspect names to their analysis types
- **`AspectDescriptor<K>`** (`src/types/descriptor.ts`): Generic descriptor with `analyzer`, `docGenerator`, and `planning` sections
- **`ASPECT_REGISTRY`** (`src/aspects/registry.ts`): Typed object keyed by `AspectName` for O(1) lookup
- **`defineAspect<K>()`** (`src/aspects/define-aspect.ts`): Factory function inferring `K` from `name`

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
├── config/             # Consolidated constants (analysis, extraction, token-estimation, prompt-gen)
├── llm/
│   ├── core/           # client.ts, provider.ts, retry.ts (LLM infrastructure)
│   ├── runners/        # analyzer.ts, generator.ts (generic runners)
│   ├── prompts/        # Prompt templates
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
├── source/             # Extraction: file-scanner, code-extractor, config-extractor, tech-stack-detector, repo-resolver
├── types/              # Type definitions (imported as @defs/*)
└── utils/              # fs.ts, logger.ts, etc.
```

## Pipeline Flow

1. **Health Check** — Validates repository before processing
2. **Phase 1: Extraction** — Scans files, extracts code chunks, configs, and tech stack
3. **Phase 2: Analysis** — Runs all aspect analyzers concurrently (limit: 3), then synthesizes essence
4. **Phase 3: Documentation** — Generates markdown docs per aspect
5. **Phase 4: Prompt Generation** — Creates AI coding prompts from analysis + docs

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
