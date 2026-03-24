import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import type { DittoConfig, LLMProvider } from "@defs/config.js"
import { UserError } from "@defs/errors.js"
import { isDebugMode, logger } from "@infra/logger.js"
import { Output, generateText, zodSchema } from "ai"
import type { LanguageModel, LanguageModelUsage } from "ai"
import type { z } from "zod"
import { LLMCeilingError, SchemaValidationError, TruncationError } from "./errors.js"
import type { PresetName } from "./presets.js"
import { PROVIDER_PROFILES, type ProviderProfile, resolveCallConfig } from "./presets.js"
import { isNonRecoverableError, withRetry } from "./retry.js"

// ── ILLMClient ──────────────────────────────────────────────

export interface ILLMClient {
	readonly provider: LLMProvider
	call<T extends z.ZodType>(options: LLMCallParams<T>): Promise<LLMCallResult<z.infer<T>>>
}

// ── LLMClient ───────────────────────────────────────────────

export class LLMClient implements ILLMClient {
	readonly model: LanguageModel
	readonly provider: LLMProvider
	private readonly profile: ProviderProfile

	constructor(config: DittoConfig) {
		this.provider = config.provider
		this.profile = PROVIDER_PROFILES[config.provider]
		this.model = createModel(config)
	}

	async call<T extends z.ZodType>(options: LLMCallParams<T>): Promise<LLMCallResult<z.infer<T>>> {
		const resolved = resolveCallConfig(options.preset, this.provider)
		const maxRetries = options.maxRetries ?? resolved.maxRetries
		const timeout = options.timeout ?? resolved.timeoutMs
		const maxValidationRetries = options.maxValidationRetries ?? DEFAULT_MAX_VALIDATION_RETRIES

		const params: GenerateParams<T> = {
			model: this.model,
			temperature: resolved.temperature,
			maxOutputTokens: resolved.maxOutputTokens,
			system: options.system,
			prompt: options.prompt,
			schema: options.schema,
			schemaName: options.schemaName,
			schemaDescription: options.schemaDescription,
			timeout,
		}

		if (isDebugMode()) {
			logger.debug(`LLM request [${options.schemaName}]:`, {
				preset: options.preset,
				systemPrompt: truncate(options.system, 200),
				prompt: truncate(options.prompt, 300),
			})
		}

		let lastValidationError: SchemaValidationError | undefined
		let totalLLMCalls = 0

		for (
			let validationAttempt = 0;
			validationAttempt <= maxValidationRetries;
			validationAttempt++
		) {
			const effectiveParams = lastValidationError
				? {
						...params,
						prompt: appendValidationFeedback(params.prompt, lastValidationError),
					}
				: params

			try {
				const result = await withRetry(
					async () => {
						totalLLMCalls++
						if (totalLLMCalls > MAX_TOTAL_LLM_CALLS) {
							throw new LLMCeilingError(options.schemaName, totalLLMCalls, MAX_TOTAL_LLM_CALLS)
						}
						if (this.profile.supportsStructuredOutput) {
							return await callWithStructuredOutput(effectiveParams)
						}
						return await callWithJsonObjectMode(effectiveParams)
					},
					{ maxRetries, baseDelayMs: 1_000, maxDelayMs: 30_000 },
				)

				if (isDebugMode()) {
					logger.debug(
						`LLM call [${options.schemaName}]: ${result.usage.inputTokens} prompt + ${result.usage.outputTokens} completion tokens`,
					)
					logger.debug(`LLM response [${options.schemaName}]:`, {
						data: truncate(JSON.stringify(result.object), 500),
					})
				}

				return { data: result.object, usage: result.usage }
			} catch (error) {
				if (error instanceof SchemaValidationError && validationAttempt < maxValidationRetries) {
					lastValidationError = error
					logger.warn(
						`[${options.schemaName}] Schema validation failed (attempt ${validationAttempt + 1}/${maxValidationRetries}), retrying with feedback: ${error.validationMessage.slice(0, 200)}`,
					)
					continue
				}
				throw error
			}
		}

		// Should not reach here, but satisfy TypeScript
		throw lastValidationError
	}
}

// ── Public types ────────────────────────────────────────────

export interface LLMCallParams<T extends z.ZodType> {
	preset: PresetName
	system: string
	prompt: string
	schema: T
	schemaName: string
	schemaDescription?: string
	/** Override resolved maxRetries */
	maxRetries?: number
	/** Override resolved timeout */
	timeout?: number
	/** Max validation retry attempts (default: 2). Set 0 to disable. */
	maxValidationRetries?: number
}

export interface LLMCallResult<T> {
	data: T
	usage: LanguageModelUsage
}

// ── Internal types ──────────────────────────────────────────

const DEFAULT_MAX_VALIDATION_RETRIES = 2
const MAX_VALIDATION_ERROR_LENGTH = 500
const MAX_TOTAL_LLM_CALLS = 8
const VALIDATION_FEEDBACK_MARKER = "## Previous Attempt Failed"

interface GenerateParams<T extends z.ZodType> {
	model: LanguageModel
	temperature: number
	maxOutputTokens: number
	system: string
	prompt: string
	schema: T
	schemaName: string
	schemaDescription?: string
	timeout: number
}

type CallResult<T> = { object: T; usage: LanguageModelUsage }

// ── Model factory ───────────────────────────────────────────

const ZAI_BASE_URL = "https://api.z.ai/api/coding/paas/v4"

function createModel(config: DittoConfig): LanguageModel {
	const { provider, model, apiKeys } = config

	switch (provider) {
		case "openai": {
			const apiKey = apiKeys.openai
			if (!apiKey) {
				throw new UserError(
					"OpenAI API key is required. Set OPENAI_API_KEY environment variable or configure via `ditto config set apiKeys.openai <key>`.",
				)
			}
			const openai = createOpenAI({ apiKey })
			return openai.chat(model)
		}
		case "anthropic": {
			const apiKey = apiKeys.anthropic
			if (!apiKey) {
				throw new UserError(
					"Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or configure via `ditto config set apiKeys.anthropic <key>`.",
				)
			}
			const anthropic = createAnthropic({ apiKey })
			return anthropic(model)
		}
		case "zai": {
			const apiKey = apiKeys.zai
			if (!apiKey) {
				throw new UserError(
					"Z.AI API key is required. Set ZAI_API_KEY environment variable or configure via `ditto config set apiKeys.zai <key>`.",
				)
			}
			const zai = createOpenAI({ apiKey, baseURL: ZAI_BASE_URL })
			return zai.chat(model)
		}
		default:
			throw new UserError(`Unsupported provider: ${provider}`)
	}
}

// ── Strategies ──────────────────────────────────────────────

/**
 * For providers supporting json_schema mode (OpenAI, Anthropic).
 * Uses AI SDK v6 Output.object() for native structured output.
 * Falls back to json_object mode if Output.object() fails due to format errors.
 */
async function callWithStructuredOutput<T extends z.ZodType>(
	params: GenerateParams<T>,
): Promise<CallResult<z.infer<T>>> {
	try {
		const response = await generateText({
			model: params.model,
			temperature: params.temperature,
			maxOutputTokens: params.maxOutputTokens,
			maxRetries: 0,
			system: params.system,
			prompt: params.prompt,
			output: Output.object({
				schema: params.schema,
				name: params.schemaName,
				description: params.schemaDescription,
			}),
			abortSignal: AbortSignal.timeout(params.timeout),
		})
		if (response.finishReason === "length") {
			throw new TruncationError(params.schemaName, response.finishReason)
		}
		if (!response.output) {
			throw new Error(`No structured output generated for ${params.schemaName}`)
		}
		return { object: response.output, usage: response.usage }
	} catch (error) {
		// Non-recoverable errors — do not waste a fallback call
		if (error instanceof Error && isNonRecoverableError(error)) {
			throw error
		}
		// Truncation errors — bubble up immediately
		if (error instanceof TruncationError) {
			throw error
		}
		// Validation errors — bubble up for validation retry loop
		if (error instanceof SchemaValidationError) {
			throw error
		}
		// Non-recoverable and validation errors are already handled above.
		// Any remaining error (output format, provider quirks, etc.) → fallback to json_object mode.
		logger.debug(
			`[${params.schemaName}] Output.object() failed (${error instanceof Error ? error.message : String(error)}), falling back to json_object mode`,
		)
		try {
			return await callWithJsonObjectMode(params)
		} catch (fallbackError) {
			const message = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
			const originalMessage = error instanceof Error ? error.message : String(error)
			throw new Error(`${message} (original structured output error: ${originalMessage})`, {
				cause: error,
			})
		}
	}
}

/**
 * For providers that only support json_object mode (e.g. GLM-5 via z.ai).
 * Embeds full JSON Schema in system prompt and uses Output.json().
 * Falls back to raw text extraction if Output.json() parsing fails.
 */
async function callWithJsonObjectMode<T extends z.ZodType>(
	params: GenerateParams<T>,
): Promise<CallResult<z.infer<T>>> {
	const schemaText = JSON.stringify(zodSchema(params.schema).jsonSchema, null, 2)
	const systemWithSchema = `${params.system}

You MUST respond with ONLY a valid JSON object (no markdown, no explanation, no code blocks).
The JSON MUST strictly conform to this JSON Schema:
${schemaText}`

	const response = await generateText({
		model: params.model,
		temperature: params.temperature,
		maxOutputTokens: params.maxOutputTokens,
		maxRetries: 0,
		system: systemWithSchema,
		prompt: params.prompt,
		output: Output.json(),
		abortSignal: AbortSignal.timeout(params.timeout),
	})

	if (response.finishReason === "length") {
		throw new TruncationError(params.schemaName, response.finishReason)
	}

	// Output.json() returns untyped JSON — validate with Zod
	let validationError: string | undefined
	if (response.output != null) {
		// First try: parse as-is
		const firstTry = params.schema.safeParse(response.output)
		if (firstTry.success) {
			return { object: firstTry.data, usage: response.usage }
		}
		// Second try: normalize null→[] for GLM models that return null for empty arrays
		const normalized = normalizeNullArrays(response.output)
		const validated = params.schema.safeParse(normalized)
		if (validated.success) {
			return { object: validated.data, usage: response.usage }
		}
		validationError = validated.error.message
		logger.debug(
			`[${params.schemaName}] JSON parsed but schema validation failed: ${validationError}`,
		)
	}

	// Fallback: try extracting JSON from raw text
	const parsed = tryExtractJSON(response.text, params.schema)
	if (parsed) {
		return { object: parsed, usage: response.usage }
	}

	throw new SchemaValidationError(
		params.schemaName,
		validationError ?? `Failed to extract valid JSON. Response: ${response.text.slice(0, 200)}`,
		response.output ?? response.text,
	)
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Recursively convert null values to [] where the surrounding context
 * suggests an array was expected (sibling keys have array values).
 * Handles GLM models returning null for empty arrays.
 */
function normalizeNullArrays(obj: unknown): unknown {
	if (obj === null || obj === undefined) return obj
	if (Array.isArray(obj)) return obj.map(normalizeNullArrays)
	if (typeof obj === "object") {
		const result: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
			result[key] = value === null ? [] : normalizeNullArrays(value)
		}
		return result
	}
	return obj
}

function appendValidationFeedback(originalPrompt: string, error: SchemaValidationError): string {
	const truncated =
		error.validationMessage.length > MAX_VALIDATION_ERROR_LENGTH
			? `${error.validationMessage.slice(0, MAX_VALIDATION_ERROR_LENGTH)}...`
			: error.validationMessage

	// Remove any previous validation feedback to avoid accumulation
	const markerIndex = originalPrompt.indexOf(VALIDATION_FEEDBACK_MARKER)
	const cleanPrompt =
		markerIndex !== -1 ? originalPrompt.slice(0, markerIndex).trimEnd() : originalPrompt

	return `${cleanPrompt}

## Previous Attempt Failed — Schema Validation Error
Your previous response did not match the required JSON schema. Fix the following issues and respond with the corrected JSON only:
${truncated}`
}

/** @internal Exported for testing */
export function tryExtractJSON<T extends z.ZodType>(text: string, schema: T): z.infer<T> | null {
	let jsonText = text.trim()

	// Strip markdown code block wrappers
	const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
	if (codeBlockMatch) {
		jsonText = codeBlockMatch[1].trim()
	}

	// Try to find JSON object or array in the text — strip leading/trailing non-JSON
	const objectStart = jsonText.indexOf("{")
	const arrayStart = jsonText.indexOf("[")

	let jsonStart: number
	let closeChar: string

	if (objectStart === -1 && arrayStart === -1) return null

	if (objectStart === -1) {
		jsonStart = arrayStart
		closeChar = "]"
	} else if (arrayStart === -1) {
		jsonStart = objectStart
		closeChar = "}"
	} else {
		// Use whichever comes first
		if (objectStart <= arrayStart) {
			jsonStart = objectStart
			closeChar = "}"
		} else {
			jsonStart = arrayStart
			closeChar = "]"
		}
	}

	jsonText = jsonText.slice(jsonStart)

	// Nesting-aware: find the matching close bracket, tracking both {} and []
	let braceDepth = 0
	let bracketDepth = 0
	let endIndex = -1
	const rootIsBrace = closeChar === "}"
	for (let i = 0; i < jsonText.length; i++) {
		const ch = jsonText[i]
		if (ch === '"') {
			// Skip string contents (handle escapes)
			i++
			while (i < jsonText.length) {
				if (jsonText[i] === "\\") {
					i++ // skip escaped char
				} else if (jsonText[i] === '"') {
					break
				}
				i++
			}
			continue
		}
		if (ch === "{") braceDepth++
		else if (ch === "}") braceDepth--
		else if (ch === "[") bracketDepth++
		else if (ch === "]") bracketDepth--

		// Root element closed when its own depth returns to 0
		if (rootIsBrace && braceDepth === 0) {
			endIndex = i
			break
		}
		if (!rootIsBrace && bracketDepth === 0) {
			endIndex = i
			break
		}
	}

	if (endIndex === -1) return null
	jsonText = jsonText.slice(0, endIndex + 1)

	try {
		const parsed = JSON.parse(jsonText)
		const validated = schema.safeParse(parsed)
		if (validated.success) {
			return validated.data
		}
		logger.debug(`JSON parsed but schema validation failed: ${validated.error.message}`)
	} catch {
		// Not valid JSON
	}

	return null
}

function truncate(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str
	return `${str.slice(0, maxLen)}...`
}
