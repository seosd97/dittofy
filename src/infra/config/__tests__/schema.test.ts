import { describe, expect, it } from "vitest"
import { configSchema } from "../schema.js"

describe("configSchema", () => {
	it("parses valid config with all fields", () => {
		const result = configSchema.safeParse({
			output: "my-output",
			language: "en",
			model: "gpt-5.4-mini",
			provider: "openai",
			apiKeys: { openai: "sk-test123" },
			docsOnly: false,
			promptsOnly: false,
		})
		expect(result.success).toBe(true)
	})

	it("applies defaults for missing optional fields", () => {
		const result = configSchema.safeParse({
			apiKeys: { openai: "sk-test123" },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.output).toBe("ditto-output")
			expect(result.data.language).toBe("en")
			expect(result.data.model).toBe("gpt-5.4-mini")
			expect(result.data.provider).toBe("openai")
			expect(result.data.docsOnly).toBe(false)
			expect(result.data.promptsOnly).toBe(false)
		}
	})

	it("rejects invalid provider", () => {
		const result = configSchema.safeParse({
			provider: "invalid-provider",
			apiKeys: { openai: "sk-test" },
		})
		expect(result.success).toBe(false)
	})

	it("rejects invalid language", () => {
		const result = configSchema.safeParse({
			language: "fr",
			apiKeys: { openai: "sk-test" },
		})
		expect(result.success).toBe(false)
	})

	it("requires API key for selected provider", () => {
		const result = configSchema.safeParse({
			provider: "anthropic",
			apiKeys: { openai: "sk-test" },
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0].message).toContain("anthropic")
		}
	})

	it("passes when correct provider API key is set", () => {
		const result = configSchema.safeParse({
			provider: "anthropic",
			apiKeys: { anthropic: "sk-ant-test" },
		})
		expect(result.success).toBe(true)
	})

	it("rejects empty API key string", () => {
		const result = configSchema.safeParse({
			provider: "openai",
			apiKeys: { openai: "" },
		})
		expect(result.success).toBe(false)
	})

	it("rejects empty output path", () => {
		const result = configSchema.safeParse({
			output: "",
			apiKeys: { openai: "sk-test" },
		})
		expect(result.success).toBe(false)
	})

	it("accepts zai provider with zai key", () => {
		const result = configSchema.safeParse({
			provider: "zai",
			apiKeys: { zai: "zai-test-key" },
		})
		expect(result.success).toBe(true)
	})

	it("accepts gemini provider with gemini key", () => {
		const result = configSchema.safeParse({
			provider: "gemini",
			apiKeys: { gemini: "gemini-test-key" },
		})
		expect(result.success).toBe(true)
	})

	it("accepts openrouter provider with openrouter key", () => {
		const result = configSchema.safeParse({
			provider: "openrouter",
			apiKeys: { openrouter: "openrouter-test-key" },
		})
		expect(result.success).toBe(true)
	})

	it("accepts groq provider with groq key", () => {
		const result = configSchema.safeParse({
			provider: "groq",
			apiKeys: { groq: "groq-test-key" },
		})
		expect(result.success).toBe(true)
	})

	it("accepts mistral provider with mistral key", () => {
		const result = configSchema.safeParse({
			provider: "mistral",
			apiKeys: { mistral: "mistral-test-key" },
		})
		expect(result.success).toBe(true)
	})

	it("accepts deepseek provider with deepseek key", () => {
		const result = configSchema.safeParse({
			provider: "deepseek",
			apiKeys: { deepseek: "deepseek-test-key" },
		})
		expect(result.success).toBe(true)
	})

	it("accepts xai provider with xai key", () => {
		const result = configSchema.safeParse({
			provider: "xai",
			apiKeys: { xai: "xai-test-key" },
		})
		expect(result.success).toBe(true)
	})
})
