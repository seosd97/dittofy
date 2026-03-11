import { z } from "zod"

export const configSchema = z
	.object({
		output: z.string().min(1).default("ditto-output"),
		language: z.enum(["ko", "en"]).default("ko"),
		model: z.string().default("gpt-5.2"),
		provider: z.enum(["openai", "anthropic", "zai"]).default("openai"),
		apiKeys: z
			.object({
				openai: z.string().optional(),
				anthropic: z.string().optional(),
				zai: z.string().optional(),
			})
			.default({}),
		docsOnly: z.boolean().default(false),
		promptsOnly: z.boolean().default(false),
	})
	.refine(
		(data) => {
			const key = data.apiKeys[data.provider]
			return key != null && key.length > 0
		},
		(data) => ({
			message: `API key for provider "${data.provider}" is required. Set ${getEnvVarName(data.provider)} environment variable or configure via \`ditto config set apiKeys.${data.provider} <key>\`.`,
			path: ["apiKeys", data.provider],
		}),
	)

function getEnvVarName(provider: string): string {
	const map: Record<string, string> = {
		openai: "OPENAI_API_KEY",
		anthropic: "ANTHROPIC_API_KEY",
		zai: "ZAI_API_KEY",
	}
	return map[provider] ?? `${provider.toUpperCase()}_API_KEY`
}
