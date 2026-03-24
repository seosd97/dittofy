import { describe, expect, it } from "vitest"
import { validateAnalysisPlan } from "../plan-parser.js"
import type { AnalysisPlan } from "../plan-parser.js"

describe("validateAnalysisPlan", () => {
	it("keeps valid plan unchanged", () => {
		const plan: AnalysisPlan = {
			projectSummary: "Test project",
			aspects: ["designTokens", "typography"],
			waves: [
				{ order: 1, aspects: ["designTokens"] },
				{ order: 2, aspects: ["typography"] },
			],
			fileSelection: {
				designTokens: ["tokens.css"],
				typography: ["styles.css"],
			},
		}
		const result = validateAnalysisPlan(plan)
		expect(result.aspects).toEqual(["designTokens", "typography"])
	})

	it("adds designTokens if missing", () => {
		const plan: AnalysisPlan = {
			projectSummary: "Test",
			aspects: ["typography"],
			waves: [{ order: 1, aspects: ["typography"] }],
			fileSelection: {},
		}
		const result = validateAnalysisPlan(plan)
		expect(result.aspects[0]).toBe("designTokens")
	})

	it("adds designTokens to Wave 1 if missing", () => {
		const plan: AnalysisPlan = {
			projectSummary: "Test",
			aspects: ["designTokens", "typography"],
			waves: [{ order: 1, aspects: ["typography"] }],
			fileSelection: {},
		}
		const result = validateAnalysisPlan(plan)
		expect(result.waves[0].aspects).toContain("designTokens")
	})

	it("creates default wave when empty", () => {
		const plan: AnalysisPlan = {
			projectSummary: "Test",
			aspects: ["designTokens"],
			waves: [],
			fileSelection: {},
		}
		const result = validateAnalysisPlan(plan)
		expect(result.waves.length).toBeGreaterThan(0)
		expect(result.waves[0].aspects).toContain("designTokens")
	})
})
