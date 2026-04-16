import { logger } from "@infra/logger.js"
import { LLMCeilingError, SchemaValidationError, TruncationError } from "./errors.js"

export interface RetryConfig {
	maxRetries: number
	baseDelayMs: number
	maxDelayMs: number
}

const DEFAULT_RETRY: RetryConfig = {
	maxRetries: 3,
	baseDelayMs: 1_000,
	maxDelayMs: 30_000,
}

const MAX_RETRY_AFTER_SECONDS = 300

export async function withRetry<T>(
	fn: () => Promise<T>,
	config: RetryConfig = DEFAULT_RETRY,
): Promise<T> {
	let lastError: Error | undefined

	for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error as Error

			if (!isRetryable(error)) {
				throw error
			}

			if (attempt < config.maxRetries) {
				const delay = calculateDelay(attempt, config, error)
				logger.warn(
					`LLM call failed (attempt ${attempt + 1}/${config.maxRetries + 1}): ${lastError.message}. Retrying in ${delay}ms...`,
				)
				await sleep(delay)
			}
		}
	}

	throw lastError
}

function isRetryable(error: unknown): boolean {
	// Schema validation errors — handled by validation retry loop, not network retry
	if (error instanceof SchemaValidationError) return false
	if (error instanceof TruncationError) return false

	if (error instanceof Error) {
		// Auth/billing errors — never retry
		if (isNonRecoverableError(error)) return false

		// Rate limit or server errors (by HTTP status code)
		const status = getHttpStatus(error)
		if (status != null) {
			return status === 429 || status >= 500
		}
		// Timeout
		if (error.name === "AbortError" || error.name === "TimeoutError") {
			return true
		}
		// Network-level errors
		if (error.message?.includes("ECONNRESET") || error.message?.includes("ETIMEDOUT")) {
			return true
		}
	}
	return false
}

/** Extract HTTP status from AI SDK errors (supports both `statusCode` and `status` properties) */
export function getHttpStatus(error: Error): number | undefined {
	if ("statusCode" in error && typeof (error as Record<string, unknown>).statusCode === "number") {
		return (error as { statusCode: number }).statusCode
	}
	if ("status" in error && typeof (error as Record<string, unknown>).status === "number") {
		return (error as { status: number }).status
	}
	return undefined
}

/** Check if an error is non-recoverable (auth, billing, permission) and should never be retried or fallen back */
export function isNonRecoverableError(error: Error): boolean {
	const status = getHttpStatus(error)
	if (status === 401 || status === 402 || status === 403) return true

	if (
		error.message?.includes("余额不足") ||
		error.message?.includes("API key") ||
		error.message?.includes("Unauthorized") ||
		error.message?.includes("Forbidden")
	) {
		return true
	}
	if (error instanceof LLMCeilingError) return true
	return false
}

function calculateDelay(attempt: number, config: RetryConfig, error: unknown): number {
	// Respect Retry-After header for rate limits
	if (error instanceof Error) {
		const status = getHttpStatus(error)
		if (status === 429 && "responseHeaders" in error) {
			const headers = (error as { responseHeaders: Record<string, string> }).responseHeaders
			const retryAfter = headers?.["retry-after"]
			if (retryAfter) {
				const seconds = Number.parseInt(retryAfter, 10)
				if (!Number.isNaN(seconds) && seconds > 0 && seconds <= MAX_RETRY_AFTER_SECONDS) {
					return seconds * 1_000
				}
			}
		}
	}

	// Exponential backoff with jitter
	const exponential = config.baseDelayMs * 2 ** attempt
	const jitter = Math.random() * config.baseDelayMs
	return Math.min(exponential + jitter, config.maxDelayMs)
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
