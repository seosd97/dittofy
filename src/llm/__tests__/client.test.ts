import { describe, expect, it } from "vitest"
import { z } from "zod"
import { tryExtractJSON } from "../core/client.js"

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

	it("returns null for JSON array (only objects supported)", () => {
		const result = tryExtractJSON("[1,2,3]", testSchema)
		expect(result).toBeNull()
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
})
