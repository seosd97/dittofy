import { Output, generateText, zodSchema } from "ai"
import type { LanguageModel, LanguageModelUsage } from "ai"
import type { z } from "zod"
import type { LLMProvider } from "../types/config.js"
import { logger } from "../utils/logger.js"
import type { PresetName } from "./presets.js"
import { resolveCallConfig } from "./presets.js"
import { isNonRecoverableError, withRetry } from "./retry.js"

// ── Provider context (set once per pipeline run) ────────────
// Module-level state is acceptable for CLI (single pipeline run per process).
// For tests, use `options.provider` override or call `setLLMProvider` in setup.

let _provider: LLMProvider = "openai"

/** Must be called before any LLM calls. Set by the pipeline orchestrator. */
export function setLLMProvider(provider: LLMProvider): void {
	_provider = provider
}

// ── Public API ──────────────────────────────────────────────

export interface LLMCallOptions {
	model: LanguageModel
	preset: PresetName
	/** Override module-level provider (useful for tests) */
	provider?: LLMProvider
	/** Override resolved maxRetries */
	maxRetries?: number
	/** Override resolved timeout */
	timeout?: number
}

export interface LLMCallResult<T> {
	data: T
	usage: LanguageModelUsage
}

export async function callLLM<T extends z.ZodType>(
	options: LLMCallOptions & {
		system: string
		prompt: string
		schema: T
		schemaName: string
		schemaDescription?: string
	},
): Promise<LLMCallResult<z.infer<T>>> {
	const { model, preset, system, prompt, schema, schemaName, schemaDescription } = options

	const effectiveProvider = options.provider ?? _provider
	const resolved = resolveCallConfig(preset, effectiveProvider)
	const maxRetries = options.maxRetries ?? resolved.maxRetries
	const timeout = options.timeout ?? resolved.timeoutMs

	const params: GenerateParams<T> = {
		model,
		temperature: resolved.temperature,
		maxOutputTokens: resolved.maxOutputTokens,
		system,
		prompt,
		schema,
		schemaName,
		schemaDescription,
		timeout,
	}

	const result = await withRetry(
		async () => {
			if (supportsJsonSchemaMode(effectiveProvider)) {
				return await callWithStructuredOutput(params)
			}
			return await callWithJsonObjectMode(params)
		},
		{ maxRetries, baseDelayMs: 1_000, maxDelayMs: 30_000 },
	)

	logger.debug(
		`LLM call [${schemaName}]: ${result.usage.inputTokens} prompt + ${result.usage.outputTokens} completion tokens`,
	)

	return { data: result.object, usage: result.usage }
}

// ── Internal types ──────────────────────────────────────────

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

// ── Strategies ──────────────────────────────────────────────

function supportsJsonSchemaMode(provider: LLMProvider): boolean {
	return provider !== "zhipu"
}

/**
 * For providers supporting json_schema mode (OpenAI, Anthropic).
 * Uses AI SDK v6 Output.object() for native structured output.
 * Falls back to json_object mode on failure.
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
		if (!response.output) {
			throw new Error(`No structured output generated for ${params.schemaName}`)
		}
		return { object: response.output, usage: response.usage }
	} catch (structuredError) {
		// Non-recoverable errors — do not waste a fallback call
		if (structuredError instanceof Error && isNonRecoverableError(structuredError)) {
			throw structuredError
		}
		logger.debug(
			`[${params.schemaName}] Output.object() failed (${structuredError instanceof Error ? structuredError.message : String(structuredError)}), falling back to json_object mode`,
		)
		try {
			return await callWithJsonObjectMode(params)
		} catch (fallbackError) {
			// Preserve both errors for debugging: throw fallback error with original context
			const message =
				fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
			const originalMessage =
				structuredError instanceof Error ? structuredError.message : String(structuredError)
			throw new Error(
				`${message} (original structured output error: ${originalMessage})`,
				{ cause: structuredError },
			)
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

	// Output.json() returns untyped JSON — validate with Zod
	if (response.output != null) {
		const validated = params.schema.safeParse(response.output)
		if (validated.success) {
			return { object: validated.data, usage: response.usage }
		}
		logger.debug(
			`[${params.schemaName}] JSON parsed but schema validation failed: ${validated.error.message}`,
		)
	}

	// Fallback: try extracting JSON from raw text
	const parsed = tryExtractJSON(response.text, params.schema)
	if (parsed) {
		return { object: parsed, usage: response.usage }
	}

	throw new Error(
		`Failed to extract valid JSON for ${params.schemaName}. Response: ${response.text.slice(0, 200)}...`,
	)
}

// ── Helpers ─────────────────────────────────────────────────

/** @internal Exported for testing */
export function tryExtractJSON<T extends z.ZodType>(text: string, schema: T): z.infer<T> | null {
	let jsonText = text.trim()

	// Strip markdown code block wrappers
	const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
	if (codeBlockMatch) {
		jsonText = codeBlockMatch[1].trim()
	}

	// Try to find JSON object in the text — strip leading/trailing non-JSON
	const jsonStart = jsonText.indexOf("{")
	if (jsonStart === -1) return null
	jsonText = jsonText.slice(jsonStart)

	const jsonEnd = jsonText.lastIndexOf("}")
	if (jsonEnd === -1) return null
	jsonText = jsonText.slice(0, jsonEnd + 1)

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
