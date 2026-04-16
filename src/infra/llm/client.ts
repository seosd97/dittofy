import { createAnthropic } from "@ai-sdk/anthropic"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createMistral } from "@ai-sdk/mistral"
import { createOpenAI } from "@ai-sdk/openai"
import { createXai } from "@ai-sdk/xai"
import type { DittoConfig, LLMProvider } from "@defs/config.js"
import { UserError } from "@defs/errors.js"
import type { PresetName } from "@domain/constants/target-presets.js"
import { formatProviderKeyHint } from "@infra/config/provider-env.js"
import { isDebugMode, logger } from "@infra/logger.js"
import { Output, generateText, zodSchema } from "ai"
import type { LanguageModel, LanguageModelUsage } from "ai"
import type { z } from "zod"
import { LLMCeilingError, SchemaValidationError, TruncationError } from "./errors.js"
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
				systemPrompt: maskSensitive(truncate(options.system, 200)),
				prompt: maskSensitive(truncate(options.prompt, 300)),
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
						data: maskSensitive(truncate(JSON.stringify(result.object), 500)),
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
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

function createModel(config: DittoConfig): LanguageModel {
	const { provider, model, apiKeys } = config

	switch (provider) {
		case "openai": {
			const apiKey = apiKeys.openai
			if (!apiKey) {
				throw new UserError(
					`OpenAI API key is required. Set ${formatProviderKeyHint("openai")} environment variable or configure via \`ditto config set apiKeys.openai <key>\`.`,
				)
			}
			const openai = createOpenAI({ apiKey })
			return openai.chat(model)
		}
		case "anthropic": {
			const apiKey = apiKeys.anthropic
			if (!apiKey) {
				throw new UserError(
					`Anthropic API key is required. Set ${formatProviderKeyHint("anthropic")} environment variable or configure via \`ditto config set apiKeys.anthropic <key>\`.`,
				)
			}
			const anthropic = createAnthropic({ apiKey })
			return anthropic(model)
		}
		case "zai": {
			const apiKey = apiKeys.zai
			if (!apiKey) {
				throw new UserError(
					`Z.AI API key is required. Set ${formatProviderKeyHint("zai")} environment variable or configure via \`ditto config set apiKeys.zai <key>\`.`,
				)
			}
			const zai = createOpenAI({ apiKey, baseURL: ZAI_BASE_URL })
			return zai.chat(model)
		}
		case "gemini": {
			const apiKey = apiKeys.gemini
			if (!apiKey) {
				throw new UserError(
					`Gemini API key is required. Set ${formatProviderKeyHint("gemini")} environment variable or configure via \`ditto config set apiKeys.gemini <key>\`.`,
				)
			}
			const gemini = createGoogleGenerativeAI({ apiKey })
			return gemini(model)
		}
		case "openrouter": {
			const apiKey = apiKeys.openrouter
			if (!apiKey) {
				throw new UserError(
					`OpenRouter API key is required. Set ${formatProviderKeyHint("openrouter")} environment variable or configure via \`ditto config set apiKeys.openrouter <key>\`.`,
				)
			}
			const openrouter = createOpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL })
			return openrouter.chat(model)
		}
		case "groq": {
			const apiKey = apiKeys.groq
			if (!apiKey) {
				throw new UserError(
					`Groq API key is required. Set ${formatProviderKeyHint("groq")} environment variable or configure via \`ditto config set apiKeys.groq <key>\`.`,
				)
			}
			const groq = createGroq({ apiKey })
			return groq(model)
		}
		case "mistral": {
			const apiKey = apiKeys.mistral
			if (!apiKey) {
				throw new UserError(
					`Mistral API key is required. Set ${formatProviderKeyHint("mistral")} environment variable or configure via \`ditto config set apiKeys.mistral <key>\`.`,
				)
			}
			const mistral = createMistral({ apiKey })
			return mistral(model)
		}
		case "deepseek": {
			const apiKey = apiKeys.deepseek
			if (!apiKey) {
				throw new UserError(
					`DeepSeek API key is required. Set ${formatProviderKeyHint("deepseek")} environment variable or configure via \`ditto config set apiKeys.deepseek <key>\`.`,
				)
			}
			const deepseek = createDeepSeek({ apiKey })
			return deepseek(model)
		}
		case "xai": {
			const apiKey = apiKeys.xai
			if (!apiKey) {
				throw new UserError(
					`xAI API key is required. Set ${formatProviderKeyHint("xai")} environment variable or configure via \`ditto config set apiKeys.xai <key>\`.`,
				)
			}
			const xai = createXai({ apiKey })
			return xai(model)
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
		const normalized = normalizeNullArrays(response.output, params.schema)
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
 * Recursively convert null values to [] only for fields that the Zod schema
 * expects to be arrays. This handles GLM models returning null for empty arrays
 * without converting legitimate null values (e.g. nullable strings like defaultTheme).
 */
function normalizeNullArrays(obj: unknown, schema: z.ZodType): unknown {
	if (obj === null || obj === undefined) return obj
	if (Array.isArray(obj)) return obj
	if (typeof obj !== "object") return obj

	const shape = extractObjectShape(schema)
	if (!shape) {
		return fallbackNormalizeNullArrays(obj)
	}

	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		const fieldSchema = shape[key]
		if (value === null && fieldSchema && isZodArrayType(fieldSchema)) {
			result[key] = []
		} else if (
			typeof value === "object" &&
			value !== null &&
			!Array.isArray(value) &&
			fieldSchema
		) {
			const inner = deepUnwrap(fieldSchema)
			result[key] = normalizeNullArrays(value, inner)
		} else if (Array.isArray(value)) {
			result[key] = value
		} else {
			result[key] = value
		}
	}
	return result
}

const MAX_UNWRAP_DEPTH = 20

type ZodDef = {
	typeName?: string
	innerType?: z.ZodType
	shape?: Record<string, z.ZodType> | (() => Record<string, z.ZodType>)
	type?: z.ZodType
	brand?: unknown
	catchValue?: unknown
	getter?: () => z.ZodType
	in?: z.ZodType
	schema?: z.ZodType
}

function isZodArrayType(schema: z.ZodType): boolean {
	const unwrapped = deepUnwrap(schema)
	const def = unwrapped._def as ZodDef
	return def?.typeName === "ZodArray"
}

function deepUnwrap(schema: z.ZodType): z.ZodType {
	let current: z.ZodType = schema
	for (let i = 0; i < MAX_UNWRAP_DEPTH; i++) {
		const next = unwrapOneLevel(current)
		if (next === current) return current
		current = next
	}
	return current
}

function unwrapOneLevel(schema: z.ZodType): z.ZodType {
	const def = schema._def as ZodDef
	if (!def) return schema

	switch (def.typeName) {
		case "ZodOptional":
		case "ZodNullable":
		case "ZodDefault":
		case "ZodReadonly":
			return def.innerType ?? schema
		case "ZodBranded":
			return (def.type as z.ZodType | undefined) ?? schema
		case "ZodCatch":
			return def.innerType ?? schema
		case "ZodPipeline":
			return def.in ?? schema
		case "ZodEffects":
			return def.schema ?? schema
		case "ZodLazy":
			return def.getter ? def.getter() : schema
		default:
			return schema
	}
}

function extractObjectShape(schema: z.ZodType): Record<string, z.ZodType> | null {
	const unwrapped = deepUnwrap(schema)
	const def = unwrapped._def as ZodDef
	if (def?.typeName === "ZodObject") {
		const shape =
			typeof def.shape === "function" ? (def.shape as () => Record<string, z.ZodType>)() : def.shape
		return (shape ?? {}) as Record<string, z.ZodType>
	}
	return null
}

function fallbackNormalizeNullArrays(obj: unknown): unknown {
	if (obj === null || obj === undefined) return obj
	if (Array.isArray(obj)) return obj
	if (typeof obj === "object") {
		const entries = Object.entries(obj as Record<string, unknown>)
		const hasArrayField = entries.some(([, v]) => Array.isArray(v))
		const result: Record<string, unknown> = {}
		for (const [key, value] of entries) {
			if (value === null && hasArrayField) {
				result[key] = []
			} else {
				result[key] = fallbackNormalizeNullArrays(value)
			}
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

// ── Sensitive data masking ──────────────────────────────────

const SENSITIVE_PATTERNS = [
	/sk-[a-zA-Z0-9]{16,}/g,
	/bearer\s+[a-zA-Z0-9._\-]{16,}/gi,
	/key[_\-]?(?:[a-zA-Z0-9_\-]*_)?[a-zA-Z0-9]{16,}/gi,
	/api[_\-]?key["\s:=]+["']?[a-zA-Z0-9]{16,}/gi,
	/token["\s:=]+["']?[a-zA-Z0-9._\-]{16,}/gi,
]

function maskSensitive(text: string): string {
	let masked = text
	for (const pattern of SENSITIVE_PATTERNS) {
		masked = masked.replace(pattern, (match) => {
			const visible = match.slice(0, Math.min(match.indexOf("-") > 0 ? match.indexOf("-") + 4 : 7))
			return `${visible}***`
		})
	}
	return masked
}

function truncate(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str
	return `${str.slice(0, maxLen)}...`
}
