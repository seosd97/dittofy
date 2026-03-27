import type { DittoConfig } from "@defs/config.js"

export const defaultConfig: DittoConfig = {
	output: "ditto-output",
	language: "en",
	model: "gpt-5.4-mini",
	provider: "openai",
	apiKeys: {},
	docsOnly: false,
	promptsOnly: false,
}
