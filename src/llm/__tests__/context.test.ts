import type { CodeChunk, FileTreeNode } from "@defs/extraction.js"
import { buildContext, estimateTokens } from "@llm/context.js"
import { describe, expect, it } from "vitest"

describe("estimateTokens", () => {
	it("estimates ASCII text at ~4 chars per token", () => {
		const text = "hello world" // 11 chars -> ceil(11/4) = 3
		expect(estimateTokens(text)).toBe(3)
	})

	it("estimates CJK text at ~1.5 tokens per char", () => {
		const text = "안녕하세요" // 5 Korean chars -> ceil(5 * 1.5) = 8
		expect(estimateTokens(text)).toBe(8)
	})

	it("handles mixed ASCII and CJK", () => {
		const text = "Hello 세계" // 6 ASCII + 2 CJK -> ceil(6/4 + 2*1.5) = ceil(1.5 + 3) = 5
		expect(estimateTokens(text)).toBe(5)
	})

	it("handles Chinese characters", () => {
		const text = "你好世界" // 4 CJK -> ceil(4 * 1.5) = 6
		expect(estimateTokens(text)).toBe(6)
	})

	it("handles Japanese text", () => {
		const text = "こんにちは" // 5 Hiragana -> ceil(5 * 1.5) = 8
		expect(estimateTokens(text)).toBe(8)
	})

	it("returns 0 for empty string", () => {
		expect(estimateTokens("")).toBe(0)
	})
})

describe("buildContext", () => {
	const makeChunk = (filePath: string, content: string): CodeChunk => ({
		filePath,
		content,
		extension: filePath.split(".").pop() ?? "",
		size: content.length,
	})

	const emptyTree: FileTreeNode[] = []

	it("includes all files within budget", () => {
		const chunks: CodeChunk[] = [
			makeChunk("src/Button.tsx", "button code"),
			makeChunk("tailwind.config.ts", "tailwind config"),
		]

		const result = buildContext(chunks, emptyTree)

		expect(result.codeContext).toContain("tailwind config")
		expect(result.codeContext).toContain("button code")
	})

	it("sorts remaining files by size (smaller first)", () => {
		const chunks: CodeChunk[] = [
			makeChunk("src/Big.tsx", "x".repeat(100)),
			makeChunk("src/Small.tsx", "small"),
		]

		const result = buildContext(chunks, emptyTree)

		// small file should appear before big file in output
		const smallIdx = result.codeContext.indexOf("small")
		const bigIdx = result.codeContext.indexOf("x".repeat(100))
		expect(smallIdx).toBeLessThan(bigIdx)
	})

	it("returns totalTokenEstimate > 0 when content exists", () => {
		const chunks: CodeChunk[] = [
			makeChunk("src/Button.tsx", "export function Button() { return <button>Click</button> }"),
		]

		const result = buildContext(chunks, emptyTree)

		expect(result.totalTokenEstimate).toBeGreaterThan(0)
	})

	it("respects token budget and does not exceed it", () => {
		const largeContent = "x".repeat(10000)
		const chunks: CodeChunk[] = [
			makeChunk("src/A.tsx", largeContent),
			makeChunk("src/B.tsx", largeContent),
			makeChunk("src/C.tsx", largeContent),
		]

		// Very small budget
		const result = buildContext(chunks, emptyTree, { tokenBudget: 100 })

		// Should not include all three files given the tiny budget
		const fileCount = (result.codeContext.match(/---/g) || []).length / 2
		expect(fileCount).toBeLessThan(3)
	})
})
