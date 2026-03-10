export class UserError extends Error {
	readonly code = 1

	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = "UserError"
	}
}

export class SystemError extends Error {
	readonly code = 2

	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = "SystemError"
	}
}

export class LLMError extends Error {
	readonly code = 3
	readonly provider?: string
	readonly model?: string

	constructor(message: string, options?: ErrorOptions & { provider?: string; model?: string }) {
		super(message, options)
		this.name = "LLMError"
		this.provider = options?.provider
		this.model = options?.model
	}
}
