import type { DittoConfig } from "@defs/config.js"

export const defaultConfig: DittoConfig = {
	output: "ditto-output",
	language: "ko",
	model: "gpt-5.2",
	provider: "openai",
	apiKeys: {},
	docsOnly: false,
	promptsOnly: false,
}
