/** Provider name → environment variable name mapping */
export const PROVIDER_ENV_VARS: Record<string, string> = {
	openai: "OPENAI_API_KEY",
	anthropic: "ANTHROPIC_API_KEY",
	zai: "ZAI_API_KEY",
	gemini: "GOOGLE_GENERATIVE_AI_API_KEY",
	openrouter: "OPENROUTER_API_KEY",
	groq: "GROQ_API_KEY",
	mistral: "MISTRAL_API_KEY",
	deepseek: "DEEPSEEK_API_KEY",
	xai: "XAI_API_KEY",
}

export function formatProviderKeyHint(provider: string): string {
	return PROVIDER_ENV_VARS[provider] ?? `${provider.toUpperCase()}_API_KEY`
}
