import { access } from "node:fs/promises"
import type { AnalysisResult } from "@defs/analysis.js"
import type { DittoConfig, LLMProvider } from "@defs/config.js"
import { UserError } from "@defs/errors.js"
import { listTargetPresets } from "@domain/constants/target-presets.js"
import { formatProviderKeyHint } from "@infra/config/provider-env.js"
import { readFileContent } from "@infra/fs.js"
import { logger } from "@infra/logger.js"
import type { GenerateConfig } from "./orchestrator.js"

// ── API Key Messages ──────────────────────────────────────

const API_KEY_MESSAGES: Record<LLMProvider, string> = {
	openai: `OpenAI API key is required. Set ${formatProviderKeyHint("openai")} environment variable or configure via \`ditto config set apiKeys.openai <key>\`.`,
	anthropic: `Anthropic API key is required. Set ${formatProviderKeyHint("anthropic")} environment variable or configure via \`ditto config set apiKeys.anthropic <key>\`.`,
	zai: `Z.AI API key is required. Set ${formatProviderKeyHint("zai")} environment variable or configure via \`ditto config set apiKeys.zai <key>\`.`,
	gemini: `Gemini API key is required. Set ${formatProviderKeyHint("gemini")} environment variable or configure via \`ditto config set apiKeys.gemini <key>\`.`,
	openrouter: `OpenRouter API key is required. Set ${formatProviderKeyHint("openrouter")} environment variable or configure via \`ditto config set apiKeys.openrouter <key>\`.`,
	groq: `Groq API key is required. Set ${formatProviderKeyHint("groq")} environment variable or configure via \`ditto config set apiKeys.groq <key>\`.`,
	mistral: `Mistral API key is required. Set ${formatProviderKeyHint("mistral")} environment variable or configure via \`ditto config set apiKeys.mistral <key>\`.`,
	deepseek: `DeepSeek API key is required. Set ${formatProviderKeyHint("deepseek")} environment variable or configure via \`ditto config set apiKeys.deepseek <key>\`.`,
	xai: `xAI API key is required. Set ${formatProviderKeyHint("xai")} environment variable or configure via \`ditto config set apiKeys.xai <key>\`.`,
}

// ── Validation Functions ──────────────────────────────────

/** Validates config before any expensive work (extraction, LLM calls). */
export function validateAnalysisConfig(config: DittoConfig): void {
	const key = config.apiKeys[config.provider]
	if (!key) {
		throw new UserError(API_KEY_MESSAGES[config.provider])
	}

	if (config.provider === "zai") {
		logger.debug("Provider zai: json_object mode only (no structured output)")
	}
}

/** Validates generate pipeline inputs before any work. */
export async function validateGenerateInput(
	generateConfig: GenerateConfig,
): Promise<AnalysisResult> {
	// File existence
	try {
		await access(generateConfig.analysisPath)
	} catch {
		throw new UserError(
			`Analysis file not found: ${generateConfig.analysisPath}\nRun \`ditto analyze\` first to generate it.`,
		)
	}

	// JSON parsing
	let raw: string
	try {
		raw = await readFileContent(generateConfig.analysisPath)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new UserError(`Failed to read analysis file: ${message}`)
	}

	let parsed: unknown
	try {
		parsed = JSON.parse(raw)
	} catch {
		throw new UserError(
			`Invalid JSON in analysis file: ${generateConfig.analysisPath}\nThe file may be corrupted. Re-run \`ditto analyze\` to regenerate it.`,
		)
	}

	// Basic shape validation
	if (typeof parsed !== "object" || parsed === null) {
		throw new UserError("Analysis file does not contain a valid JSON object.")
	}
	const obj = parsed as Record<string, unknown>

	const requiredFields = ["techStack", "essence"]
	const missing = requiredFields.filter((f) => !obj[f])
	if (missing.length > 0) {
		throw new UserError(`Analysis file is missing required fields: ${missing.join(", ")}`)
	}

	const aspectFields = [
		"designTokens",
		"typography",
		"componentCatalog",
		"layoutSystem",
		"pageStructures",
		"responsiveStrategy",
		"interactionPatterns",
	]
	const hasAnyAspect = aspectFields.some((f) => f in obj)
	if (!hasAnyAspect) {
		throw new UserError(
			"Analysis file contains no aspect data (designTokens, typography, etc.). Re-run `ditto analyze` to regenerate it.",
		)
	}

	// Target preset validation
	if (generateConfig.target) {
		const known = listTargetPresets()
		if (!known.includes(generateConfig.target)) {
			throw new UserError(
				`Unknown target preset: "${generateConfig.target}". Available presets: ${known.join(", ")}`,
			)
		}
	}

	return parsed as AnalysisResult
}
