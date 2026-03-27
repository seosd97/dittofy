# Dittofy

[English](./README.md) | [한국어](./README.ko.md)

[![CI](https://github.com/seosd97/dittofy/actions/workflows/ci.yml/badge.svg)](https://github.com/seosd97/dittofy/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/seosd97/dittofy/graph/badge.svg)](https://codecov.io/gh/seosd97/dittofy)
[![npm version](https://img.shields.io/npm/v/dittofy)](https://www.npmjs.com/package/dittofy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Analyze frontend repositories, extract reusable design essence, and generate implementation prompts for AI coding agents.

## What It Does

- Scans a FE codebase and builds a structured `analysis.json`.
- Generates human-readable design spec docs from that analysis.
- Generates step-by-step implementation prompts for coding agents.

Dittofy extracts design patterns and intent. It is not a 1:1 pixel-clone generator.

## Install

```bash
npm install -g dittofy
```

You can run commands with either `ditto` or `dittofy`:

```bash
ditto --help
dittofy --help
```

Or use without global install:

```bash
npx dittofy analyze ./my-app
```

## Requirements

- Node.js `>=22.0.0`

## Quick Start

```bash
# 1) Set API key for your provider
export OPENAI_API_KEY=sk-...

# 2) Analyze + generate docs/prompts in one run
ditto analyze ./my-react-app

# 3) Re-generate docs/prompts later from existing analysis (no LLM calls)
ditto generate --from ditto-output/my-react-app/analysis.json --target next-tailwind
```

## Output Artifacts

By default, `analyze` writes into:

```text
ditto-output/<project-name>/
```

Typical structure:

```text
ditto-output/
└── my-react-app/
    ├── analysis.json
    ├── analysis.md
    ├── design-spec/
    │   ├── 01-design-tokens.md
    │   ├── 02-typography.md
    │   ├── 03-component-catalog.md
    │   ├── 04-layout-system.md
    │   └── ...
    └── prompts/
        ├── README.md
        ├── step-01-setup.md
        ├── step-02-design-tokens.md
        └── ...
```

## CLI Reference

### `ditto analyze <source>`

Analyze a local repository path or GitHub URL. This command runs LLM-based analysis unless you pass `--dry-run`.

Arguments:

| Argument | Required | Description |
| --- | --- | --- |
| `<source>` | Yes | Local path or GitHub URL to analyze |

Options:

| Option | Default | Description |
| --- | --- | --- |
| `-o, --output <dir>` | `ditto-output` | Output base directory. Final path is `<output>/<project-name>`. |
| `-m, --model <id>` | `gpt-5.4-mini` | Model ID passed directly to the selected provider SDK. |
| `-p, --provider <name>` | `openai` | LLM provider: `openai`, `anthropic`, `zai`, `gemini`, `openrouter`, `groq`, `mistral`, `deepseek`, `xai`. |
| `-l, --language <ko\|en>` | `en` | Output language for analysis/docs/prompts. |
| `--analyze-only` | `false` | Run analysis only. Writes `analysis.json` / `analysis.md`; skips docs/prompts. |
| `--docs-only` | `false` | Generate design spec docs only; skip prompts. |
| `--prompts-only` | `false` | Generate prompts only; skip docs. |
| `--include <paths>` | — | Additional paths (comma-separated), mainly for monorepo shared packages. |
| `--dry-run` | `false` | Extraction-only preview. No LLM calls, no API key required. |
| `-d, --debug` | `false` | Enable debug logging. |

Examples:

```bash
ditto analyze ./apps/web
ditto analyze https://github.com/user/repo
ditto analyze ./apps/web --include packages/ui,packages/tokens
ditto analyze ./apps/web --analyze-only
ditto analyze ./apps/web --dry-run
```

### `ditto generate --from <analysis.json>`

Generate docs/prompts from an existing analysis file. This command is template-based and does not call LLMs.

Options:

| Option | Default | Description |
| --- | --- | --- |
| `--from <path>` | Required | Path to `analysis.json`. |
| `-o, --output <dir>` | `./ditto-output` | Output directory for generated docs/prompts. |
| `-l, --language <ko\|en>` | `en` | Output language. |
| `-t, --target <preset\|auto>` | `auto` | Target preset: `auto`, `next-tailwind`, `react-css-modules`, `vue-css`, `svelte-tailwind`. |
| `--docs-only` | `false` | Generate docs only. |
| `--prompts-only` | `false` | Generate prompts only. |
| `--dry-run` | `false` | Preview what would be generated without writing files. |

Examples:

```bash
ditto generate --from ditto-output/my-react-app/analysis.json
ditto generate --from ditto-output/my-react-app/analysis.json --target next-tailwind
ditto generate --from ditto-output/my-react-app/analysis.json --docs-only
ditto generate --from ditto-output/my-react-app/analysis.json --dry-run
```

### `ditto config`

Manage global config at `~/.ditto/settings.json`.

Commands:

| Command | Description |
| --- | --- |
| `ditto config show` | Show merged current config (with API key masking). |
| `ditto config set <key> <value>` | Set a config value. |
| `ditto config path` | Print config file path. |

`config set` keys:

| Key | Description |
| --- | --- |
| `output` | Default output base directory |
| `language` | Default output language (`en` or `ko`) |
| `model` | Default model ID |
| `provider` | Default provider (`openai`, `anthropic`, `zai`, `gemini`, `openrouter`, `groq`, `mistral`, `deepseek`, `xai`) |

API keys are not set via `config set`; use environment variables or `.env`.

## Provider and Model Support

Supported providers:

| Provider | API key env var | Model handling | Structured output mode |
| --- | --- | --- | --- |
| `openai` | `OPENAI_API_KEY` | Passed to `openai.chat(<model>)` | Yes |
| `anthropic` | `ANTHROPIC_API_KEY` | Passed to `anthropic(<model>)` | Yes |
| `zai` | `ZAI_API_KEY` | Passed to OpenAI-compatible client at Z.AI base URL | No (`json_object` path) |
| `gemini` | `GOOGLE_GENERATIVE_AI_API_KEY` | Passed to `google(<model>)` | Yes |
| `openrouter` | `OPENROUTER_API_KEY` | Passed to OpenAI-compatible client at OpenRouter base URL | No (`json_object` path) |
| `groq` | `GROQ_API_KEY` | Passed to `groq(<model>)` | Yes |
| `mistral` | `MISTRAL_API_KEY` | Passed to `mistral(<model>)` | Yes |
| `deepseek` | `DEEPSEEK_API_KEY` | Passed to `deepseek(<model>)` | Yes |
| `xai` | `XAI_API_KEY` | Passed to `xai(<model>)` | Yes |

Model compatibility contract:

| Provider | `--model` handling | Recommended capability | Practical default |
| --- | --- | --- | --- |
| `openai` | Forwarded directly to `openai.chat(model)` | Chat model with reliable JSON/schema output | `gpt-5.4-mini` |
| `anthropic` | Forwarded directly to `anthropic(model)` | Chat model with reliable JSON/schema output | Use your team standard Anthropic model ID |
| `zai` | Forwarded to OpenAI-compatible `chat(model)` on Z.AI base URL | Chat model that follows strict JSON-object instructions | `glm-5`-class IDs are suitable |
| `gemini` | Forwarded directly to `google(model)` | Chat model with reliable JSON/schema output | Use your team standard Gemini model ID |
| `openrouter` | Forwarded to OpenAI-compatible `chat(model)` on OpenRouter base URL | Model that follows strict JSON-object instructions | Use a router-supported chat model ID |
| `groq` | Forwarded directly to `groq(model)` | Fast chat model with reliable JSON/schema output | Use your team standard Groq model ID |
| `mistral` | Forwarded directly to `mistral(model)` | Chat model with reliable JSON/schema output | Use your team standard Mistral model ID |
| `deepseek` | Forwarded directly to `deepseek(model)` | Chat model with reliable JSON/schema output | Use your team standard DeepSeek model ID |
| `xai` | Forwarded directly to `xai(model)` | Chat model with reliable JSON/schema output | Use your team standard xAI model ID |

Model policy and guarantees:

- Dittofy does not enforce a hardcoded model allowlist.
- The `--model` value is forwarded to the selected provider SDK without rewriting.
- Invalid/unsupported model IDs fail at provider API level and are surfaced as CLI errors.
- OpenAI, Anthropic, Gemini, Groq, Mistral, DeepSeek, and xAI attempt schema-native structured output first.
- Z.AI and OpenRouter use JSON-object mode in this project.
- `analyze` uses LLM calls; `generate` is deterministic template rendering (no LLM calls).
- Structured-output failures fall back to JSON mode.
- Schema validation failures trigger validation retries with corrective feedback.
- Retry policy handles transient issues (`429`, `5xx`, network timeouts). Auth/billing/permission errors fail fast.

Quick validation command:

```bash
ditto analyze ./my-app --provider <provider> --model <model-id> --analyze-only
```

Runtime profile defaults:

- `openai`, `anthropic`, `gemini`, `openrouter`, `groq`, `mistral`, `deepseek`, `xai`: token `1.0x`, timeout `1.0x`, max retries `3`.
- `zai`: token `1.5x`, timeout `2.0x`, max retries `2`.

Model-related failure patterns:

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `API key is required` | Missing key for selected provider | Set provider key env var from the provider table above |
| Provider/model not found or invalid request | Wrong model ID for provider | Verify model ID in provider console and rerun |
| Frequent `Output truncated` errors | Response exceeds output budget | Use a more capable model or narrow analysis scope (`--include`, target app path) |
| Repeated schema validation errors | Model follows schema poorly | Try a stronger model on the same provider |

## Target Presets (`generate --target`)

| Preset | Framework | Language | Styling | Build |
| --- | --- | --- | --- | --- |
| `auto` | Auto-detected from analysis | Auto | Auto | Auto |
| `next-tailwind` | Next.js | TypeScript | Tailwind CSS | Next.js built-in |
| `react-css-modules` | React | TypeScript | CSS Modules | Vite |
| `vue-css` | Vue | TypeScript | Scoped CSS | Vite |
| `svelte-tailwind` | Svelte | TypeScript | Tailwind CSS | Vite |

## Configuration and Precedence

Config is merged in this order:

1. Built-in defaults
2. `~/.ditto/settings.json`
3. Project-level config / `.env` (via `c12` loading)
4. CLI arguments

Example `ditto.config.ts`:

```ts
export default {
	output: "ditto-output",
	provider: "openai",
	model: "gpt-5.4-mini",
	language: "en",
}
```

API keys:

```bash
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
ZAI_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
OPENROUTER_API_KEY=...
GROQ_API_KEY=...
MISTRAL_API_KEY=...
DEEPSEEK_API_KEY=...
XAI_API_KEY=...
```

## Monorepo Notes

- If you point to a specific app path, Dittofy auto-detects monorepo root and workspace deps.
- `--include` lets you force-add shared packages for analysis context.
- If you point to monorepo root with multiple FE apps, Dittofy asks you to choose a specific app path.

## Troubleshooting

- `API key is required`: set the key for your selected provider (see the Provider and Model Support table above).
- `Unknown target preset`: use one of the listed presets.
- `Analysis file not found`: run `ditto analyze` first or fix `--from` path.

## License

MIT
