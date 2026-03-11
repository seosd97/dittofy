import type { AnalysisResult, ComponentInfo } from "@defs/analysis.js"
import { planSteps } from "@pipeline/planners/steps.js"
import { describe, expect, it } from "vitest"

function makeComponent(name: string): ComponentInfo {
	return {
		name,
		filePath: `src/components/${name}.tsx`,
		category: "atom",
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
	it("always includes setup and design-system steps", () => {
		const plan = planSteps(createMinimalAnalysis())
		expect(plan.totalSteps).toBe(2)
		expect(plan.steps[0].stepType).toBe("setup")
		expect(plan.steps[0].stepNumber).toBe(1)
		expect(plan.steps[0].dependencies).toEqual([])
		expect(plan.steps[1].stepType).toBe("design-system")
		expect(plan.steps[1].stepNumber).toBe(2)
		expect(plan.steps[1].dependencies).toEqual([1])
	})

	it("adds component steps grouped by 5", () => {
		const components = Array.from({ length: 12 }, (_, i) => makeComponent(`Comp${i + 1}`))
		const plan = planSteps(
			createMinimalAnalysis({
				componentCatalog: { components, patterns: [] },
			}),
		)

		const compSteps = plan.steps.filter((s) => s.stepType === "components")
		expect(compSteps).toHaveLength(3) // ceil(12/5) = 3 groups
		expect(compSteps[0].componentNames).toHaveLength(5)
		expect(compSteps[1].componentNames).toHaveLength(5)
		expect(compSteps[2].componentNames).toHaveLength(2)
		// All depend on steps 1 and 2
		for (const step of compSteps) {
			expect(step.dependencies).toEqual([1, 2])
		}
	})

	it("adds page step with correct dependencies", () => {
		const plan = planSteps(
			createMinimalAnalysis({
				componentCatalog: {
					components: [makeComponent("Button"), makeComponent("Card")],
					patterns: [],
				},
				pageStructures: {
					pages: [
						{
							name: "Home",
							route: "/",
							layout: "default",
							sections: [],
							components: [],
							confidence: "high",
						},
					],
				},
			}),
		)

		const pageStep = plan.steps.find((s) => s.stepType === "pages")
		expect(pageStep).toBeDefined()
		// Depends on setup(1), design-system(2), and component step(3)
		expect(pageStep?.dependencies).toEqual([1, 2, 3])
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
		// 50 components → ceil(50/5) = 10 groups + setup + design-system + pages + responsive + interactions = 15
		const components = Array.from({ length: 50 }, (_, i) => makeComponent(`C${i}`))
		const plan = planSteps(
			createMinimalAnalysis({
				componentCatalog: { components, patterns: [] },
				pageStructures: {
					pages: [
						{
							name: "Home",
							route: "/",
							layout: "default",
							sections: [],
							components: [],
							confidence: "high",
						},
					],
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
		const components = Array.from({ length: 8 }, (_, i) => makeComponent(`C${i}`))
		const plan = planSteps(
			createMinimalAnalysis({
				componentCatalog: { components, patterns: [] },
				pageStructures: {
					pages: [
						{
							name: "Home",
							route: "/",
							layout: "default",
							sections: [],
							components: [],
							confidence: "high",
						},
					],
				},
			}),
		)

		for (let i = 0; i < plan.steps.length; i++) {
			expect(plan.steps[i].stepNumber).toBe(i + 1)
		}
	})
})
