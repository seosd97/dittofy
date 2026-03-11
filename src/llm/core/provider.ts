import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import type { DittoConfig } from "@defs/config.js"
import { UserError } from "@defs/errors.js"
import type { LanguageModel } from "ai"

const ZAI_BASE_URL = "https://api.z.ai/api/coding/paas/v4"

export function createModel(config: DittoConfig): LanguageModel {
	const { provider, model, apiKeys } = config

	switch (provider) {
		case "openai": {
			const apiKey = apiKeys.openai
			if (!apiKey) {
				throw new UserError(
					"OpenAI API key is required. Set OPENAI_API_KEY environment variable or configure via `ditto config set apiKeys.openai <key>`.",
				)
			}
			const openai = createOpenAI({ apiKey })
			return openai.chat(model)
		}
		case "anthropic": {
			const apiKey = apiKeys.anthropic
			if (!apiKey) {
				throw new UserError(
					"Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or configure via `ditto config set apiKeys.anthropic <key>`.",
				)
			}
			const anthropic = createAnthropic({ apiKey })
			return anthropic(model)
		}
		case "zai": {
			const apiKey = apiKeys.zai
			if (!apiKey) {
				throw new UserError(
					"Z.AI API key is required. Set ZAI_API_KEY environment variable or configure via `ditto config set apiKeys.zai <key>`.",
				)
			}
			const zai = createOpenAI({ apiKey, baseURL: ZAI_BASE_URL })
			return zai.chat(model)
		}
		default:
			throw new UserError(`Unsupported provider: ${provider}`)
	}
}
