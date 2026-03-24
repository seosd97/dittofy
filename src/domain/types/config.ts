export type LLMProvider = "openai" | "anthropic" | "zai"

export interface DittoConfig {
	output: string
	language: "ko" | "en"
	model: string
	provider: LLMProvider
	apiKeys: {
		openai?: string
		anthropic?: string
		zai?: string
	}
	docsOnly: boolean
	promptsOnly: boolean
}

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
