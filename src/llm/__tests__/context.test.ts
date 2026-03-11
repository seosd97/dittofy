import type { ContextConfig } from "@defs/descriptor.js"
import type { CodeChunk, ConfigFile, FileTreeNode } from "@defs/extraction.js"
import { buildContextForAnalyzer, estimateTokens } from "@llm/context.js"
import { describe, expect, it } from "vitest"

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

describe("buildContextForAnalyzer", () => {
	const makeChunk = (filePath: string, category: string, content: string): CodeChunk => ({
		filePath,
		category: category as CodeChunk["category"],
		content,
		extension: filePath.split(".").pop() ?? "",
		size: content.length,
	})

	const makeConfig = (filePath: string, content: string): ConfigFile => ({
		name: filePath.split("/").pop() ?? "",
		filePath,
		content,
		type: "package",
	})

	const emptyTree: FileTreeNode[] = []

	it("selects files matching mustIncludePatterns first", () => {
		const config: ContextConfig = {
			filePriorities: ["component", "style"],
			mustIncludePatterns: [/tailwind\.config/],
		}
		const chunks: CodeChunk[] = [
			makeChunk("src/Button.tsx", "component", "button code"),
			makeChunk("tailwind.config.ts", "config", "tailwind config"),
		]

		const result = buildContextForAnalyzer(config, chunks, [], emptyTree)

		expect(result.codeContext).toContain("tailwind config")
		expect(result.codeContext).toContain("button code")
	})

	it("prioritizes files by filePriorities order", () => {
		const config: ContextConfig = {
			filePriorities: ["style", "component"],
			mustIncludePatterns: [],
		}
		const chunks: CodeChunk[] = [
			makeChunk("src/Button.tsx", "component", "button"),
			makeChunk("src/globals.css", "style", "styles"),
		]

		const result = buildContextForAnalyzer(config, chunks, [], emptyTree)

		// style should appear before component in output
		const styleIdx = result.codeContext.indexOf("styles")
		const compIdx = result.codeContext.indexOf("button")
		expect(styleIdx).toBeLessThan(compIdx)
	})

	it("includes config files in configContext", () => {
		const config: ContextConfig = {
			filePriorities: [],
			mustIncludePatterns: [],
		}
		const configs: ConfigFile[] = [makeConfig("package.json", '{"name": "test"}')]

		const result = buildContextForAnalyzer(config, [], configs, emptyTree)

		expect(result.configContext).toContain("package.json")
		expect(result.configContext).toContain('"name": "test"')
	})

	it("returns totalTokenEstimate > 0 when content exists", () => {
		const config: ContextConfig = {
			filePriorities: ["component"],
			mustIncludePatterns: [],
		}
		const chunks: CodeChunk[] = [
			makeChunk(
				"src/Button.tsx",
				"component",
				"export function Button() { return <button>Click</button> }",
			),
		]

		const result = buildContextForAnalyzer(config, chunks, [], emptyTree)

		expect(result.totalTokenEstimate).toBeGreaterThan(0)
	})

	it("respects token budget and does not exceed it", () => {
		const config: ContextConfig = {
			filePriorities: ["component"],
			mustIncludePatterns: [],
		}
		const largeContent = "x".repeat(10000)
		const chunks: CodeChunk[] = [
			makeChunk("src/A.tsx", "component", largeContent),
			makeChunk("src/B.tsx", "component", largeContent),
			makeChunk("src/C.tsx", "component", largeContent),
		]

		// Very small budget
		const result = buildContextForAnalyzer(config, chunks, [], emptyTree, 100)

		// Should not include all three files given the tiny budget
		const fileCount = (result.codeContext.match(/---/g) || []).length / 2
		expect(fileCount).toBeLessThan(3)
	})
})
