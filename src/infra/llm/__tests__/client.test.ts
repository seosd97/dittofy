import { type MockInstance, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Mock provider modules before any imports that use them
vi.mock("@ai-sdk/openai", () => ({
	createOpenAI: vi.fn().mockReturnValue({
		chat: vi.fn().mockReturnValue("mock-model"),
	}),
}))

vi.mock("@ai-sdk/anthropic", () => ({
	createAnthropic: vi.fn().mockReturnValue(vi.fn().mockReturnValue("mock-model")),
}))

vi.mock("@ai-sdk/google", () => ({
	createGoogleGenerativeAI: vi.fn().mockReturnValue(vi.fn().mockReturnValue("mock-model")),
}))

vi.mock("@ai-sdk/groq", () => ({
	createGroq: vi.fn().mockReturnValue(vi.fn().mockReturnValue("mock-model")),
}))

vi.mock("@ai-sdk/mistral", () => ({
	createMistral: vi.fn().mockReturnValue(vi.fn().mockReturnValue("mock-model")),
}))

vi.mock("@ai-sdk/deepseek", () => ({
	createDeepSeek: vi.fn().mockReturnValue(vi.fn().mockReturnValue("mock-model")),
}))

vi.mock("@ai-sdk/xai", () => ({
	createXai: vi.fn().mockReturnValue(vi.fn().mockReturnValue("mock-model")),
}))

// Mock ai SDK — keep real Output/zodSchema, mock generateText
vi.mock("ai", async () => {
	const actual = await vi.importActual("ai")
	return {
		...actual,
		generateText: vi.fn(),
	}
})

import { createDeepSeek } from "@ai-sdk/deepseek"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createMistral } from "@ai-sdk/mistral"
import { createOpenAI } from "@ai-sdk/openai"
import { createXai } from "@ai-sdk/xai"
import type { DittoConfig } from "@defs/config.js"
import { generateText } from "ai"
import { LLMClient, tryExtractJSON } from "../client.js"
import { SchemaValidationError, TruncationError } from "../errors.js"

const mockedGenerateText = generateText as unknown as MockInstance
const mockedCreateOpenAI = createOpenAI as unknown as MockInstance
const mockedCreateGoogleGenerativeAI = createGoogleGenerativeAI as unknown as MockInstance
const mockedCreateGroq = createGroq as unknown as MockInstance
const mockedCreateMistral = createMistral as unknown as MockInstance
const mockedCreateDeepSeek = createDeepSeek as unknown as MockInstance
const mockedCreateXai = createXai as unknown as MockInstance

const testSchema = z.object({ name: z.string(), value: z.number() })

describe("tryExtractJSON", () => {
	it("parses clean JSON object", () => {
		const result = tryExtractJSON('{"name":"test","value":42}', testSchema)
		expect(result).toEqual({ name: "test", value: 42 })
	})

	it("strips markdown json code block", () => {
		const input = '```json\n{"name":"test","value":42}\n```'
		const result = tryExtractJSON(input, testSchema)
		expect(result).toEqual({ name: "test", value: 42 })
	})

	it("strips markdown code block without language tag", () => {
		const input = '```\n{"name":"test","value":42}\n```'
		const result = tryExtractJSON(input, testSchema)
		expect(result).toEqual({ name: "test", value: 42 })
	})

	it("extracts JSON when text precedes the object", () => {
		const input = 'Here is the result: {"name":"test","value":42}'
		const result = tryExtractJSON(input, testSchema)
		expect(result).toEqual({ name: "test", value: 42 })
	})

	it("extracts JSON even with trailing text", () => {
		const input = 'Here is the result: {"name":"test","value":42} hope this helps'
		const result = tryExtractJSON(input, testSchema)
		expect(result).toEqual({ name: "test", value: 42 })
	})

	it("returns null for invalid JSON", () => {
		const result = tryExtractJSON("not json at all", testSchema)
		expect(result).toBeNull()
	})

	it("returns null when JSON is valid but schema validation fails", () => {
		const result = tryExtractJSON('{"wrong":"field"}', testSchema)
		expect(result).toBeNull()
	})

	it("returns null for empty string", () => {
		const result = tryExtractJSON("", testSchema)
		expect(result).toBeNull()
	})

	it("extracts JSON array", () => {
		const arraySchema = z.array(z.number())
		const result = tryExtractJSON("[1,2,3]", arraySchema)
		expect(result).toEqual([1, 2, 3])
	})

	it("handles nested objects", () => {
		const nestedSchema = z.object({
			name: z.string(),
			value: z.number(),
			meta: z.object({ tag: z.string() }),
		})
		const input = '{"name":"test","value":42,"meta":{"tag":"info"}}'
		const result = tryExtractJSON(input, nestedSchema)
		expect(result).toEqual({ name: "test", value: 42, meta: { tag: "info" } })
	})

	it("handles JSON with escaped characters", () => {
		const result = tryExtractJSON('{"name":"hello\\nworld","value":1}', testSchema)
		expect(result).toEqual({ name: "hello\nworld", value: 1 })
	})

	it("extracts JSON array with trailing text", () => {
		const arraySchema = z.array(z.number())
		const result = tryExtractJSON("Here: [1,2,3] done", arraySchema)
		expect(result).toEqual([1, 2, 3])
	})

	it("extracts array of objects with trailing text", () => {
		const schema = z.array(z.object({ id: z.number() }))
		const result = tryExtractJSON('Result: [{"id":1},{"id":2}] end.', schema)
		expect(result).toEqual([{ id: 1 }, { id: 2 }])
	})

	it("handles object containing arrays (mixed brackets)", () => {
		const schema = z.object({
			name: z.string(),
			value: z.number(),
			tags: z.array(z.string()),
		})
		const input = 'Output: {"name":"test","value":1,"tags":["a","b"]} extra'
		const result = tryExtractJSON(input, schema)
		expect(result).toEqual({ name: "test", value: 1, tags: ["a", "b"] })
	})

	it("handles array containing objects (mixed brackets)", () => {
		const schema = z.array(z.object({ k: z.string() }))
		const input = 'Here: [{"k":"v1"},{"k":"v2"}] more text'
		const result = tryExtractJSON(input, schema)
		expect(result).toEqual([{ k: "v1" }, { k: "v2" }])
	})

	it("handles deeply nested mixed brackets", () => {
		const schema = z.object({
			data: z.array(z.object({ items: z.array(z.number()) })),
		})
		const input = '{"data":[{"items":[1,2]},{"items":[3]}]}'
		const result = tryExtractJSON(input, schema)
		expect(result).toEqual({ data: [{ items: [1, 2] }, { items: [3] }] })
	})

	it("handles brackets inside string values", () => {
		const result = tryExtractJSON('{"name":"[test]{foo}","value":1}', testSchema)
		expect(result).toEqual({ name: "[test]{foo}", value: 1 })
	})
})

// ── LLMClient.call tests ────────────────────────────────────

const mockConfig: DittoConfig = {
	output: "/tmp",
	language: "en",
	model: "gpt-4o",
	provider: "openai",
	apiKeys: { openai: "test-key" },
	docsOnly: false,
	promptsOnly: false,
}

const callSchema = z.object({ name: z.string(), value: z.number() })

function makeCallParams(overrides?: Record<string, unknown>) {
	return {
		preset: "tokenAnalyzer" as const,
		system: "test system",
		prompt: "test prompt",
		schema: callSchema,
		schemaName: "TestSchema",
		...overrides,
	}
}

describe("LLMClient.call", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns structured output on success", async () => {
		mockedGenerateText.mockResolvedValueOnce({
			output: { name: "test", value: 42 },
			usage: { inputTokens: 100, outputTokens: 50 },
			finishReason: "stop",
		})

		const client = new LLMClient(mockConfig)
		const result = await client.call(makeCallParams())

		expect(result.data).toEqual({ name: "test", value: 42 })
		expect(result.usage.inputTokens).toBe(100)
		expect(result.usage.outputTokens).toBe(50)
	})

	it("throws TruncationError on finishReason=length", async () => {
		mockedGenerateText.mockResolvedValueOnce({
			output: null,
			usage: { inputTokens: 100, outputTokens: 50 },
			finishReason: "length",
		})

		const client = new LLMClient(mockConfig)
		await expect(client.call(makeCallParams())).rejects.toThrow(TruncationError)
	})

	it("retries on SchemaValidationError then succeeds", async () => {
		mockedGenerateText
			.mockRejectedValueOnce(new SchemaValidationError("TestSchema", "missing field", {}))
			.mockResolvedValueOnce({
				output: { name: "fixed", value: 1 },
				usage: { inputTokens: 100, outputTokens: 50 },
				finishReason: "stop",
			})

		const client = new LLMClient(mockConfig)
		const result = await client.call(makeCallParams({ maxValidationRetries: 2 }))

		expect(result.data).toEqual({ name: "fixed", value: 1 })
		// At least 2 generateText calls (first fails, second succeeds)
		expect(mockedGenerateText.mock.calls.length).toBeGreaterThanOrEqual(2)
	})

	it("does NOT retry 401 errors", async () => {
		const error = new Error("Unauthorized") as Error & { statusCode: number }
		error.statusCode = 401
		mockedGenerateText.mockRejectedValueOnce(error)

		const client = new LLMClient(mockConfig)
		await expect(client.call(makeCallParams())).rejects.toThrow("Unauthorized")

		// Should only be called once (no retries for auth errors)
		expect(mockedGenerateText).toHaveBeenCalledTimes(1)
	})

	it("does NOT retry 403 errors", async () => {
		const error = new Error("Forbidden") as Error & { statusCode: number }
		error.statusCode = 403
		mockedGenerateText.mockRejectedValueOnce(error)

		const client = new LLMClient(mockConfig)
		await expect(client.call(makeCallParams())).rejects.toThrow("Forbidden")
		expect(mockedGenerateText).toHaveBeenCalledTimes(1)
	})

	it("passes system and prompt to generateText", async () => {
		mockedGenerateText.mockResolvedValueOnce({
			output: { name: "x", value: 0 },
			usage: { inputTokens: 10, outputTokens: 5 },
			finishReason: "stop",
		})

		const client = new LLMClient(mockConfig)
		await client.call(makeCallParams({ system: "sys-prompt", prompt: "user-prompt" }))

		const callArgs = mockedGenerateText.mock.calls[0][0]
		expect(callArgs.system).toBe("sys-prompt")
		expect(callArgs.prompt).toBe("user-prompt")
	})

	it("uses zai provider with json_object mode (no structured output)", async () => {
		mockedGenerateText.mockResolvedValueOnce({
			output: { name: "zai-test", value: 7 },
			text: '{"name":"zai-test","value":7}',
			usage: { inputTokens: 50, outputTokens: 25 },
			finishReason: "stop",
		})

		const zaiConfig: DittoConfig = {
			...mockConfig,
			provider: "zai",
			model: "glm-5",
			apiKeys: { zai: "test-zai-key" },
		}
		const client = new LLMClient(zaiConfig)
		const result = await client.call(makeCallParams())

		expect(result.data).toEqual({ name: "zai-test", value: 7 })
		// zai uses json_object mode — system prompt should include JSON Schema instructions
		const callArgs = mockedGenerateText.mock.calls[0][0]
		expect(callArgs.system).toContain("JSON Schema")
	})

	it("creates gemini provider model from api key + model id", () => {
		const config: DittoConfig = {
			...mockConfig,
			provider: "gemini",
			model: "gemini-2.5-flash",
			apiKeys: { gemini: "test-gemini-key" },
		}

		new LLMClient(config)

		expect(mockedCreateGoogleGenerativeAI).toHaveBeenCalledWith({ apiKey: "test-gemini-key" })
		const geminiProvider = mockedCreateGoogleGenerativeAI.mock.results[0]?.value as MockInstance
		expect(geminiProvider).toHaveBeenCalledWith("gemini-2.5-flash")
	})

	it("creates openrouter model via openai-compatible client", () => {
		const config: DittoConfig = {
			...mockConfig,
			provider: "openrouter",
			model: "openai/gpt-4o-mini",
			apiKeys: { openrouter: "test-openrouter-key" },
		}

		new LLMClient(config)

		expect(mockedCreateOpenAI).toHaveBeenCalledWith({
			apiKey: "test-openrouter-key",
			baseURL: "https://openrouter.ai/api/v1",
		})
	})

	describe("normalizeNullArrays (via json_object mode)", () => {
		beforeEach(() => {
			mockedGenerateText.mockReset()
		})

		it("converts null to [] for array fields in schema", async () => {
			const schema = z.object({
				items: z.array(z.string()),
				name: z.string().nullable(),
			})

			const jsonResponse = {
				output: { items: null, name: null },
				text: '{"items":null,"name":null}',
				usage: { inputTokens: 10, outputTokens: 5 },
				finishReason: "stop",
			}
			mockedGenerateText
				.mockResolvedValueOnce(jsonResponse)
				.mockResolvedValueOnce(jsonResponse)
				.mockResolvedValueOnce(jsonResponse)

			const zaiConfig: DittoConfig = {
				...mockConfig,
				provider: "zai",
				model: "glm-5",
				apiKeys: { zai: "test-zai-key" },
			}
			const client = new LLMClient(zaiConfig)

			const result = await client.call({
				preset: "tokenAnalyzer",
				system: "test",
				prompt: "test",
				schema,
				schemaName: "NullArrayTest",
			})

			expect(result.data.items).toEqual([])
			expect(result.data.name).toBeNull()
		})

		it("preserves defaultTheme null when other fields are arrays", async () => {
			const schema = z.object({
				spacing: z.array(z.object({ name: z.string(), value: z.string() })),
				defaultTheme: z.string().nullable().optional(),
			})

			const jsonResponse = {
				output: { spacing: null, defaultTheme: null },
				text: '{"spacing":null,"defaultTheme":null}',
				usage: { inputTokens: 10, outputTokens: 5 },
				finishReason: "stop",
			}
			mockedGenerateText
				.mockResolvedValueOnce(jsonResponse)
				.mockResolvedValueOnce(jsonResponse)
				.mockResolvedValueOnce(jsonResponse)

			const zaiConfig: DittoConfig = {
				...mockConfig,
				provider: "zai",
				model: "glm-5",
				apiKeys: { zai: "test-zai-key" },
			}
			const client = new LLMClient(zaiConfig)

			const result = await client.call({
				preset: "tokenAnalyzer",
				system: "test",
				prompt: "test",
				schema,
				schemaName: "DefaultThemeTest",
			})

			expect(result.data.spacing).toEqual([])
			expect(result.data.defaultTheme).toBeNull()
		})

		it("handles ZodLazy wrapped array fields", async () => {
			const schema = z.lazy(() =>
				z.object({
					items: z.array(z.string()),
					name: z.string().nullable(),
				}),
			)

			const jsonResponse = {
				output: { items: null, name: null },
				text: '{"items":null,"name":null}',
				usage: { inputTokens: 10, outputTokens: 5 },
				finishReason: "stop",
			}
			mockedGenerateText
				.mockResolvedValueOnce(jsonResponse)
				.mockResolvedValueOnce(jsonResponse)
				.mockResolvedValueOnce(jsonResponse)

			const zaiConfig: DittoConfig = {
				...mockConfig,
				provider: "zai",
				model: "glm-5",
				apiKeys: { zai: "test-zai-key" },
			}
			const client = new LLMClient(zaiConfig)

			const result = await client.call({
				preset: "tokenAnalyzer",
				system: "test",
				prompt: "test",
				schema,
				schemaName: "LazySchemaTest",
			})

			expect(result.data.items).toEqual([])
			expect(result.data.name).toBeNull()
		})

		it("handles ZodDefault wrapped array fields", async () => {
			const schema = z.object({
				items: z.array(z.string()).default([]),
				label: z.string(),
			})

			const jsonResponse = {
				output: { items: null, label: "test" },
				text: '{"items":null,"label":"test"}',
				usage: { inputTokens: 10, outputTokens: 5 },
				finishReason: "stop",
			}
			mockedGenerateText
				.mockResolvedValueOnce(jsonResponse)
				.mockResolvedValueOnce(jsonResponse)
				.mockResolvedValueOnce(jsonResponse)

			const zaiConfig: DittoConfig = {
				...mockConfig,
				provider: "zai",
				model: "glm-5",
				apiKeys: { zai: "test-zai-key" },
			}
			const client = new LLMClient(zaiConfig)

			const result = await client.call({
				preset: "tokenAnalyzer",
				system: "test",
				prompt: "test",
				schema,
				schemaName: "DefaultSchemaTest",
			})

			expect(result.data.items).toEqual([])
		})
	})

	it("creates groq provider model from api key + model id", () => {
		const config: DittoConfig = {
			...mockConfig,
			provider: "groq",
			model: "llama-3.3-70b-versatile",
			apiKeys: { groq: "test-groq-key" },
		}

		new LLMClient(config)

		expect(mockedCreateGroq).toHaveBeenCalledWith({ apiKey: "test-groq-key" })
		const groqProvider = mockedCreateGroq.mock.results[0]?.value as MockInstance
		expect(groqProvider).toHaveBeenCalledWith("llama-3.3-70b-versatile")
	})

	it("creates mistral provider model from api key + model id", () => {
		const config: DittoConfig = {
			...mockConfig,
			provider: "mistral",
			model: "mistral-large-latest",
			apiKeys: { mistral: "test-mistral-key" },
		}

		new LLMClient(config)

		expect(mockedCreateMistral).toHaveBeenCalledWith({ apiKey: "test-mistral-key" })
		const mistralProvider = mockedCreateMistral.mock.results[0]?.value as MockInstance
		expect(mistralProvider).toHaveBeenCalledWith("mistral-large-latest")
	})

	it("creates deepseek provider model from api key + model id", () => {
		const config: DittoConfig = {
			...mockConfig,
			provider: "deepseek",
			model: "deepseek-chat",
			apiKeys: { deepseek: "test-deepseek-key" },
		}

		new LLMClient(config)

		expect(mockedCreateDeepSeek).toHaveBeenCalledWith({ apiKey: "test-deepseek-key" })
		const deepseekProvider = mockedCreateDeepSeek.mock.results[0]?.value as MockInstance
		expect(deepseekProvider).toHaveBeenCalledWith("deepseek-chat")
	})

	it("creates xai provider model from api key + model id", () => {
		const config: DittoConfig = {
			...mockConfig,
			provider: "xai",
			model: "grok-3-mini",
			apiKeys: { xai: "test-xai-key" },
		}

		new LLMClient(config)

		expect(mockedCreateXai).toHaveBeenCalledWith({ apiKey: "test-xai-key" })
		const xaiProvider = mockedCreateXai.mock.results[0]?.value as MockInstance
		expect(xaiProvider).toHaveBeenCalledWith("grok-3-mini")
	})

	it("throws after exhausting validation retries", async () => {
		mockedGenerateText.mockReset()
		const validationError = new SchemaValidationError("TestSchema", "always invalid", {})
		for (let i = 0; i < 6; i++) {
			mockedGenerateText.mockRejectedValueOnce(validationError)
		}

		const client = new LLMClient(mockConfig)
		await expect(client.call(makeCallParams({ maxValidationRetries: 1 }))).rejects.toThrow(
			SchemaValidationError,
		)
	})
})
