import type { AnalysisResultMap } from "@defs/aspect-map.js"
import { describe, expect, it } from "vitest"
import { reconcileAnalysis } from "../reconciliation.js"

function createResults(overrides: Partial<AnalysisResultMap> = {}): AnalysisResultMap {
	return {
		designTokens: {
			spacing: [{ name: "sm", value: "0.5rem", usage: "small" }],
			borderRadius: [],
			shadows: [],
			breakpoints: [{ name: "md", value: "768px" }],
			zIndex: [],
		},
		typography: null,
		componentCatalog: null,
		layoutSystem: null,
		pageStructures: null,
		responsiveStrategy: {
			breakpoints: [{ name: "md", value: "768px" }],
			patterns: [],
		},
		interactionPatterns: null,
		...overrides,
	}
}

describe("reconcileAnalysis", () => {
	it("returns no conflicts when values match", () => {
		const result = reconcileAnalysis(createResults())
		expect(result.conflicts).toHaveLength(0)
	})

	it("detects breakpoint conflicts between tokens and responsive", () => {
		const results = createResults({
			designTokens: {
				spacing: [],
				borderRadius: [],
				shadows: [],
				breakpoints: [{ name: "md", value: "768px" }],
				zIndex: [],
			},
			responsiveStrategy: {
				breakpoints: [{ name: "md", value: "800px" }],
				patterns: [],
			},
		})

		const report = reconcileAnalysis(results)
		expect(report.conflicts.length).toBeGreaterThan(0)
		expect(report.conflicts[0].tokenValue).toBe("768px")
		expect(report.conflicts[0].otherValue).toBe("800px")
	})

	it("reports token value and other aspect in conflicts", () => {
		const results = createResults({
			designTokens: {
				spacing: [],
				borderRadius: [],
				shadows: [],
				breakpoints: [{ name: "md", value: "768px" }],
				zIndex: [],
			},
			responsiveStrategy: {
				breakpoints: [{ name: "md", value: "800px" }],
				patterns: [],
			},
		})

		const report = reconcileAnalysis(results)
		expect(report.conflicts[0].otherAspect).toBe("responsiveStrategy")
	})

	it("returns empty report when no aspects to compare", () => {
		const results = createResults({
			designTokens: null,
			responsiveStrategy: null,
		})
		const report = reconcileAnalysis(results)
		expect(report.conflicts).toHaveLength(0)
	})
})
