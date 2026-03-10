import { describe, expect, it } from "vitest"
import { estimateTokens } from "../context-builder.js"

describe("estimateTokens", () => {
	it("estimates ASCII text at ~4 chars per token", () => {
		const text = "hello world" // 11 chars → ceil(11/4) = 3
		expect(estimateTokens(text)).toBe(3)
	})

	it("estimates CJK text at ~1.5 tokens per char", () => {
		const text = "안녕하세요" // 5 Korean chars → ceil(5 * 1.5) = 8
		expect(estimateTokens(text)).toBe(8)
	})

	it("handles mixed ASCII and CJK", () => {
		const text = "Hello 세계" // 6 ASCII + 2 CJK → ceil(6/4 + 2*1.5) = ceil(1.5 + 3) = 5
		expect(estimateTokens(text)).toBe(5)
	})

	it("handles Chinese characters", () => {
		const text = "你好世界" // 4 CJK → ceil(4 * 1.5) = 6
		expect(estimateTokens(text)).toBe(6)
	})

	it("handles Japanese text", () => {
		const text = "こんにちは" // 5 Hiragana → ceil(5 * 1.5) = 8
		expect(estimateTokens(text)).toBe(8)
	})

	it("returns 0 for empty string", () => {
		expect(estimateTokens("")).toBe(0)
	})
})
