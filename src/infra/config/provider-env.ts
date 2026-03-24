/** Provider name → environment variable name mapping */
export const PROVIDER_ENV_VARS: Record<string, string> = {
	openai: "OPENAI_API_KEY",
	anthropic: "ANTHROPIC_API_KEY",
	zai: "ZAI_API_KEY",
}
