/** Thrown when LLM returns parseable JSON that fails Zod schema validation. */
export class SchemaValidationError extends Error {
	constructor(
		public readonly schemaName: string,
		public readonly validationMessage: string,
		public readonly rawOutput: unknown,
	) {
		super(`Schema validation failed for ${schemaName}: ${validationMessage}`)
		this.name = "SchemaValidationError"
	}
}

/** Thrown when LLM call ceiling is exceeded. */
export class LLMCeilingError extends Error {
	constructor(
		public readonly schemaName: string,
		public readonly callCount: number,
		public readonly maxCalls: number,
	) {
		super(`LLM call ceiling exceeded for ${schemaName}: ${callCount} calls (max: ${maxCalls})`)
		this.name = "LLMCeilingError"
	}
}

/** Thrown when LLM output is truncated due to token limit. */
export class TruncationError extends Error {
	constructor(
		public readonly schemaName: string,
		public readonly finishReason: string,
	) {
		super(`Output truncated for ${schemaName} (finishReason: ${finishReason})`)
		this.name = "TruncationError"
	}
}
