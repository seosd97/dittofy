import { planDocuments } from "@app/pipeline/planners/docs.js"
import type { AnalysisResult } from "@defs/analysis.js"
import { describe, expect, it } from "vitest"

function createMinimalAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
	return {
		techStack: {
			framework: { value: "Next.js", confidence: "high" },
			language: { value: "TypeScript", confidence: "high" },
			styling: { value: { approach: "Tailwind CSS", tier: 1 }, confidence: "high" },
		},
		designTokens: {
			spacing: [],
			borderRadius: [],
			shadows: [],
			breakpoints: [],
			zIndex: [],
		},
		typography: {
			fontFamilies: ["Inter"],
			scale: [],
			lineHeights: [],
			fontWeights: [],
		},
		componentCatalog: { components: [], patterns: [] },
		layoutSystem: {
			approach: "flexbox",
			containers: [],
			grids: [],
			navigation: [],
		},
		pageStructures: { pages: [] },
		responsiveStrategy: {
			approach: "mobile-first",
			breakpoints: [],
			patterns: [],
		},
		interactionPatterns: { animations: [], transitions: [], gestures: [] },
		essence: {
			summary: "Test",
			designPhilosophy: "Test",
			keyCharacteristics: [],
			colorStrategy: "",
			typographyStrategy: "",
			layoutStrategy: "",
			componentStrategy: "",
			interactionStrategy: "",
			appType: "marketing",
		},
		failedAnalyzers: [],
		...overrides,
	}
}

describe("planDocuments", () => {
	it("includes all 5 core documents when no analyzers failed", () => {
		const plan = planDocuments(createMinimalAnalysis())
		expect(plan.coreDocuments).toHaveLength(5)
		expect(plan.coreDocuments.every((d) => d.include)).toBe(true)
	})

	it("excludes core documents when corresponding analyzer failed", () => {
		const plan = planDocuments(
			createMinimalAnalysis({ failedAnalyzers: ["designTokens", "typography"] }),
		)

		const tokens = plan.coreDocuments.find((d) => d.filename === "01-design-tokens.md")
		expect(tokens?.include).toBe(false)
		expect(tokens?.reason).toContain("Skipped")

		const typo = plan.coreDocuments.find((d) => d.filename === "02-typography.md")
		expect(typo?.include).toBe(false)

		// Overview should still be included
		const overview = plan.coreDocuments.find((d) => d.filename === "00-overview.md")
		expect(overview?.include).toBe(true)
	})

	it("includes dynamic documents in plan (filtering now handled by templates)", () => {
		const plan = planDocuments(createMinimalAnalysis())
		// Dynamic docs are always included in the plan; actual filtering is done by templates returning null
		expect(plan.dynamicDocuments.every((d) => d.include)).toBe(true)
	})

	it("includes page structures when pages exist", () => {
		const plan = planDocuments(
			createMinimalAnalysis({
				pageStructures: {
					pages: [
						{
							name: "Home",
							route: "/",
							layout: "default",
							sections: [],
							components: [],
						},
					],
				},
			}),
		)

		const pages = plan.dynamicDocuments.find((d) => d.filename === "05-page-structures.md")
		expect(pages?.include).toBe(true)
	})

	it("includes responsive doc when breakpoints or patterns exist", () => {
		const plan = planDocuments(
			createMinimalAnalysis({
				responsiveStrategy: {
					approach: "mobile-first",
					breakpoints: [{ name: "sm", value: "640px" }],
					patterns: [],
				},
			}),
		)

		const responsive = plan.dynamicDocuments.find((d) => d.filename === "06-responsive-strategy.md")
		expect(responsive?.include).toBe(true)
	})

	it("excludes dynamic docs when analyzer failed even if data exists", () => {
		const plan = planDocuments(
			createMinimalAnalysis({
				failedAnalyzers: ["pageStructures"],
				pageStructures: {
					pages: [
						{
							name: "Home",
							route: "/",
							layout: "default",
							sections: [],
							components: [],
						},
					],
				},
			}),
		)

		const pages = plan.dynamicDocuments.find((d) => d.filename === "05-page-structures.md")
		expect(pages?.include).toBe(false)
		expect(pages?.reason).toContain("Skipped")
	})

	it("includes interactions doc when animations exist", () => {
		const plan = planDocuments(
			createMinimalAnalysis({
				interactionPatterns: {
					animations: [{ name: "fadeIn", type: "entrance", description: "Fade in" }],
					transitions: [],
					gestures: [],
				},
			}),
		)

		const interactions = plan.dynamicDocuments.find((d) => d.filename === "07-interactions.md")
		expect(interactions?.include).toBe(true)
	})

	it("overview is always included even if all analyzers failed", () => {
		const plan = planDocuments(
			createMinimalAnalysis({
				failedAnalyzers: [
					"designTokens",
					"typography",
					"componentCatalog",
					"layoutSystem",
					"pageStructures",
					"responsiveStrategy",
					"interactionPatterns",
				],
			}),
		)

		const overview = plan.coreDocuments.find((d) => d.filename === "00-overview.md")
		expect(overview?.include).toBe(true)

		const included = plan.coreDocuments.filter((d) => d.include)
		expect(included).toHaveLength(1)
	})
})
