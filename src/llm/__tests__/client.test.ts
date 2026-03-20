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

// Mock ai SDK — keep real Output/zodSchema, mock generateText
vi.mock("ai", async () => {
	const actual = await vi.importActual("ai")
	return {
		...actual,
		generateText: vi.fn(),
	}
})

import type { DittoConfig } from "@defs/config.js"
import { generateText } from "ai"
import { LLMClient, tryExtractJSON } from "../client.js"
import { SchemaValidationError, TruncationError } from "../errors.js"

const mockedGenerateText = generateText as unknown as MockInstance

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
		mockedGenerateText.mockRejectedValue(error)

		const client = new LLMClient(mockConfig)
		await expect(client.call(makeCallParams())).rejects.toThrow("Unauthorized")

		// Should only be called once (no retries for auth errors)
		expect(mockedGenerateText).toHaveBeenCalledTimes(1)
	})

	it("does NOT retry 403 errors", async () => {
		const error = new Error("Forbidden") as Error & { statusCode: number }
		error.statusCode = 403
		mockedGenerateText.mockRejectedValue(error)

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

	it("throws after exhausting validation retries", async () => {
		mockedGenerateText.mockRejectedValue(
			new SchemaValidationError("TestSchema", "always invalid", {}),
		)

		const client = new LLMClient(mockConfig)
		await expect(client.call(makeCallParams({ maxValidationRetries: 1 }))).rejects.toThrow(
			SchemaValidationError,
		)
	})
})
