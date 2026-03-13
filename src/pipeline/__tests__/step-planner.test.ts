import type { AnalysisResult, ComponentInfo } from "@defs/analysis.js"
import { planSteps } from "@pipeline/planners/steps.js"
import { describe, expect, it } from "vitest"

function makeComponent(name: string, tier: "core" | "design-system" | "domain" = "core"): ComponentInfo {
	return {
		name,
		filePath: `src/components/${name}.tsx`,
		category: "atom",
		tier,
		props: [],
		variants: [],
		description: `${name} component`,
		confidence: "high",
	}
}

function createMinimalAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
	return {
		techStack: {
			framework: { value: "Next.js", confidence: "high" },
			language: { value: "TypeScript", confidence: "high" },
			styling: { value: { approach: "Tailwind CSS", tier: 1 }, confidence: "high" },
		},
		designTokens: null,
		typography: null,
		componentCatalog: null,
		layoutSystem: null,
		pageStructures: null,
		responsiveStrategy: null,
		interactionPatterns: null,
		essence: {
			summary: "Test",
			designPhilosophy: "Test",
			keyCharacteristics: [],
			colorStrategy: "",
			typographyStrategy: "",
			layoutStrategy: "",
			componentStrategy: "",
			interactionStrategy: "",
		},
		failedAnalyzers: [],
		...overrides,
	}
}

describe("planSteps", () => {
	it("always includes setup, design-tokens, typography, and showcase-pages steps", () => {
		const plan = planSteps(createMinimalAnalysis())
		expect(plan.totalSteps).toBe(4)
		expect(plan.steps[0].stepType).toBe("setup")
		expect(plan.steps[0].dependencies).toEqual([])
		expect(plan.steps[1].stepType).toBe("design-tokens")
		expect(plan.steps[1].dependencies).toEqual([1])
		expect(plan.steps[2].stepType).toBe("typography")
		expect(plan.steps[2].dependencies).toEqual([2])
		expect(plan.steps[3].stepType).toBe("showcase-pages")
	})

	it("does not generate component steps", () => {
		const components = Array.from({ length: 12 }, (_, i) => makeComponent(`Comp${i + 1}`))
		const plan = planSteps(
			createMinimalAnalysis({
				componentCatalog: { components, patterns: [] },
			}),
		)

		const compSteps = plan.steps.filter((s) => s.stepType === ("components" as string))
		expect(compSteps).toHaveLength(0)
	})

	it("adds layout-shell step when layout data exists", () => {
		const plan = planSteps(
			createMinimalAnalysis({
				layoutSystem: {
					approach: { value: "CSS Grid + Flexbox", confidence: "high" },
					containers: [{ name: "main", maxWidth: "1200px", padding: "1rem", confidence: "high" }],
					grids: [{ type: "css-grid", columns: 12, gap: "1rem", confidence: "high" }],
					navigation: [],
				},
			}),
		)

		const layoutStep = plan.steps.find((s) => s.stepType === "layout-shell")
		expect(layoutStep).toBeDefined()
		// Depends on design-tokens(2) and typography(3)
		expect(layoutStep?.dependencies).toEqual([2, 3])
	})

	it("showcase-pages depends on design-tokens, typography, and layout-shell", () => {
		const plan = planSteps(
			createMinimalAnalysis({
				layoutSystem: {
					approach: { value: "CSS Grid", confidence: "high" },
					containers: [{ name: "main", maxWidth: "1200px", padding: "1rem", confidence: "high" }],
					grids: [],
					navigation: [],
				},
			}),
		)

		const pageStep = plan.steps.find((s) => s.stepType === "showcase-pages")
		expect(pageStep).toBeDefined()
		// design-tokens(2), typography(3), layout-shell(4)
		expect(pageStep?.dependencies).toEqual([2, 3, 4])
	})

	it("showcase-pages depends on design-tokens and typography when no layout", () => {
		const plan = planSteps(createMinimalAnalysis())

		const pageStep = plan.steps.find((s) => s.stepType === "showcase-pages")
		expect(pageStep).toBeDefined()
		// design-tokens(2), typography(3), no layout-shell
		expect(pageStep?.dependencies).toEqual([2, 3])
	})

	it("adds responsive step when patterns exist", () => {
		const plan = planSteps(
			createMinimalAnalysis({
				responsiveStrategy: {
					approach: { value: "mobile-first", confidence: "high" },
					breakpoints: [{ name: "sm", value: "640px", confidence: "high" }],
					patterns: [
						{ name: "stack", description: "Stack on mobile", breakpoint: "sm", confidence: "high" },
					],
				},
			}),
		)

		const responsiveStep = plan.steps.find((s) => s.stepType === "responsive")
		expect(responsiveStep).toBeDefined()
	})

	it("does NOT add responsive step when no patterns", () => {
		const plan = planSteps(
			createMinimalAnalysis({
				responsiveStrategy: {
					approach: { value: "mobile-first", confidence: "high" },
					breakpoints: [{ name: "sm", value: "640px", confidence: "high" }],
					patterns: [],
				},
			}),
		)

		const responsiveStep = plan.steps.find((s) => s.stepType === "responsive")
		expect(responsiveStep).toBeUndefined()
	})

	it("adds interactions step when animations exist", () => {
		const plan = planSteps(
			createMinimalAnalysis({
				interactionPatterns: {
					animations: [
						{ name: "fadeIn", type: "entrance", description: "Fade", confidence: "high" },
					],
					transitions: [],
					gestures: [],
				},
			}),
		)

		const interactionStep = plan.steps.find((s) => s.stepType === "interactions")
		expect(interactionStep).toBeDefined()
	})

	it("enforces max 12 steps", () => {
		const plan = planSteps(
			createMinimalAnalysis({
				layoutSystem: {
					approach: { value: "CSS Grid", confidence: "high" },
					containers: [{ name: "main", maxWidth: "1200px", padding: "1rem", confidence: "high" }],
					grids: [],
					navigation: [],
				},
				responsiveStrategy: {
					approach: { value: "mobile-first", confidence: "high" },
					breakpoints: [{ name: "sm", value: "640px", confidence: "high" }],
					patterns: [{ name: "stack", description: "Stack", breakpoint: "sm", confidence: "high" }],
				},
				interactionPatterns: {
					animations: [
						{ name: "fadeIn", type: "entrance", description: "Fade", confidence: "high" },
					],
					transitions: [],
					gestures: [],
				},
			}),
		)

		expect(plan.totalSteps).toBeLessThanOrEqual(12)
		expect(plan.steps).toHaveLength(plan.totalSteps)
	})

	it("step numbers are sequential", () => {
		const plan = planSteps(
			createMinimalAnalysis({
				layoutSystem: {
					approach: { value: "CSS Grid", confidence: "high" },
					containers: [{ name: "main", maxWidth: "1200px", padding: "1rem", confidence: "high" }],
					grids: [],
					navigation: [],
				},
			}),
		)

		for (let i = 0; i < plan.steps.length; i++) {
			expect(plan.steps[i].stepNumber).toBe(i + 1)
		}
	})
})
