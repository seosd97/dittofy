import { describe, expect, it } from "vitest"
import { mdTable, sanitizeTableCell, truncateValue } from "../format-utils.js"

describe("sanitizeTableCell", () => {
	it("escapes pipe characters", () => {
		expect(sanitizeTableCell("a|b|c")).toBe("a\\|b\\|c")
	})

	it("replaces newlines with spaces", () => {
		expect(sanitizeTableCell("line1\nline2")).toBe("line1 line2")
	})

	it("handles both pipes and newlines", () => {
		expect(sanitizeTableCell("a|b\nc")).toBe("a\\|b c")
	})
})

describe("truncateValue", () => {
	it("returns short text unchanged", () => {
		expect(truncateValue("hello", 10)).toBe("hello")
	})

	it("truncates long text with ellipsis", () => {
		const result = truncateValue("a".repeat(100), 60)
		expect(result.length).toBe(61) // 60 chars + ellipsis
		expect(result.endsWith("…")).toBe(true)
	})
})

describe("mdTable", () => {
	it("builds valid markdown table", () => {
		const result = mdTable(["Name", "Value"], [["primary", "#000"]])
		const lines = result.split("\n")
		expect(lines[0]).toBe("| Name | Value |")
		expect(lines[1]).toMatch(/^\| -+ \| -+ \|$/)
		expect(lines[2]).toBe("| primary | #000 |")
	})

	it("sanitizes cell content with pipes", () => {
		const result = mdTable(["Key"], [["a|b"]])
		expect(result).toContain("a\\|b")
	})

	it("truncates long cell values", () => {
		const longValue = "x".repeat(100)
		const result = mdTable(["Val"], [[longValue]])
		expect(result).not.toContain(longValue)
		expect(result).toContain("…")
	})
})
