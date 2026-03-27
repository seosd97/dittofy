import { z } from "zod"
import { formatProviderKeyHint } from "./provider-env.js"

export const configSchema = z
	.object({
		output: z.string().min(1).default("ditto-output"),
		language: z.enum(["ko", "en"]).default("en"),
		model: z.string().default("gpt-5.4-mini"),
		provider: z
			.enum([
				"openai",
				"anthropic",
				"zai",
				"gemini",
				"openrouter",
				"groq",
				"mistral",
				"deepseek",
				"xai",
			])
			.default("openai"),
		apiKeys: z
			.object({
				openai: z.string().optional(),
				anthropic: z.string().optional(),
				zai: z.string().optional(),
				gemini: z.string().optional(),
				openrouter: z.string().optional(),
				groq: z.string().optional(),
				mistral: z.string().optional(),
				deepseek: z.string().optional(),
				xai: z.string().optional(),
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
			message: `API key for provider "${data.provider}" is required. Set ${formatProviderKeyHint(data.provider)} environment variable or configure via \`ditto config set apiKeys.${data.provider} <key>\`.`,
			path: ["apiKeys", data.provider],
		}),
	)
