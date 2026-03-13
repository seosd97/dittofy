import type { AnalysisResult } from "@defs/analysis.js"
import type { DocumentSet } from "@defs/documentation.js"
import type { StepPlanEntry } from "@defs/prompts.js"
import { injectContext } from "@pipeline/prompt-gen/context-injector.js"
import { describe, expect, it } from "vitest"

function createAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
	return {
		techStack: {
			framework: { value: "Next.js", confidence: "high" },
			language: { value: "TypeScript", confidence: "high" },
			styling: { value: { approach: "Tailwind CSS", tier: 1 }, confidence: "high" },
		},
		designTokens: {
			colors: [{ name: "primary", value: "#3b82f6", usage: "Primary actions", confidence: "high" }],
			spacing: [{ name: "sm", value: "0.5rem", usage: "Tight spacing", confidence: "high" }],
			borderRadius: [{ name: "md", value: "0.375rem", confidence: "high" }],
			shadows: [{ name: "sm", value: "0 1px 2px rgba(0,0,0,0.05)", confidence: "high" }],
			breakpoints: [{ name: "sm", value: "640px", confidence: "high" }],
			zIndex: [],
		},
		typography: {
			fontFamilies: { value: ["Inter", "monospace"], confidence: "high" },
			scale: [
				{
					name: "h1",
					fontSize: "2.25rem",
					lineHeight: "2.5rem",
					fontWeight: "700",
					usage: "Page titles",
					confidence: "high",
				},
			],
			lineHeights: [{ name: "normal", value: "1.5", confidence: "high" }],
			fontWeights: [{ name: "bold", value: "700", confidence: "high" }],
		},
		componentCatalog: {
			components: [
				{
					name: "Button",
					filePath: "src/components/Button.tsx",
					category: "atom",
					tier: "core",
					props: [{ name: "variant", type: "string", required: false, defaultValue: "primary" }],
					variants: ["primary", "secondary"],
					description: "Primary action button",
					confidence: "high",
				},
				{
					name: "Card",
					filePath: "src/components/Card.tsx",
					category: "molecule",
					tier: "design-system",
					props: [],
					variants: [],
					description: "Content card",
					confidence: "high",
				},
			],
			patterns: [],
		},
		layoutSystem: {
			approach: { value: "CSS Grid + Flexbox", confidence: "high" },
			containers: [{ name: "main", maxWidth: "1200px", padding: "1rem", confidence: "high" }],
			grids: [{ type: "css-grid", columns: 12, gap: "1rem", confidence: "high" }],
			navigation: [{ type: "sidebar", description: "Fixed sidebar nav", confidence: "high" }],
		},
		pageStructures: {
			pages: [
				{
					name: "Home",
					route: "/",
					layout: "default",
					sections: ["hero", "features"],
					components: ["Button", "Card"],
					confidence: "high",
				},
			],
		},
		responsiveStrategy: {
			approach: { value: "mobile-first", confidence: "high" },
			breakpoints: [{ name: "sm", value: "640px", confidence: "high" }],
			patterns: [
				{
					name: "stack-to-grid",
					description: "Stack on mobile, grid on desktop",
					breakpoint: "sm",
					confidence: "high",
				},
			],
		},
		interactionPatterns: {
			animations: [
				{ name: "fadeIn", type: "entrance", description: "Fade in on mount", confidence: "high" },
			],
			transitions: [
				{ property: "opacity", duration: "200ms", easing: "ease-in-out", confidence: "high" },
			],
			gestures: [{ type: "swipe", description: "Swipe to dismiss", confidence: "high" }],
		},
		essence: {
			summary: "Modern SaaS dashboard",
			designPhilosophy: "Clean and functional",
			keyCharacteristics: ["Minimalist", "Accessible"],
			colorStrategy: "Blue primary",
			typographyStrategy: "Inter font family",
			layoutStrategy: "Grid-based",
			componentStrategy: "Atomic design",
			interactionStrategy: "Subtle animations",
		},
		failedAnalyzers: [],
		...overrides,
	}
}

const emptyDocSet: DocumentSet = { documents: [], outputDir: "" }
const docsWithDesign: DocumentSet = {
	documents: [
		{
			filename: "01-design-tokens.md",
			title: "Design Tokens",
			content: "Token doc content",
			category: "core",
		},
		{
			filename: "02-typography.md",
			title: "Typography",
			content: "Typography doc content",
			category: "core",
		},
		{
			filename: "03-component-catalog.md",
			title: "Components",
			content: "Component doc content",
			category: "core",
		},
	],
	outputDir: "",
}

describe("injectContext", () => {
	describe("setup context", () => {
		it("includes design essence and token categories (stack-agnostic)", () => {
			const step: StepPlanEntry = {
				stepNumber: 1,
				stepType: "setup",
				title: "Setup",
				scope: "",
				dependencies: [],
			}
			const ctx = injectContext(step, createAnalysis(), emptyDocSet)

			expect(ctx).toContain("Modern SaaS dashboard")
			expect(ctx).toContain("Minimalist")
			expect(ctx).toContain("Design Token Categories")
			expect(ctx).toContain("Colors")
			expect(ctx).toContain("Spacing")
			expect(ctx).toContain("Typography")
		})

		it("does not include specific tech stack as requirements", () => {
			const analysis = createAnalysis()
			analysis.techStack.uiLibrary = { value: "shadcn/ui", confidence: "high" }
			analysis.techStack.buildTool = { value: "Vite", confidence: "high" }
			const step: StepPlanEntry = {
				stepNumber: 1,
				stepType: "setup",
				title: "Setup",
				scope: "",
				dependencies: [],
			}
			const ctx = injectContext(step, analysis, emptyDocSet)

			expect(ctx).not.toContain("Next.js")
			expect(ctx).not.toContain("shadcn/ui")
			expect(ctx).not.toContain("Vite")
		})
	})

	describe("design-tokens context", () => {
		it("includes color, spacing, radius, shadow tokens", () => {
			const step: StepPlanEntry = {
				stepNumber: 2,
				stepType: "design-tokens",
				title: "Design Tokens",
				scope: "",
				dependencies: [1],
			}
			const ctx = injectContext(step, createAnalysis(), docsWithDesign)

			expect(ctx).toContain("primary")
			expect(ctx).toContain("#3b82f6")
			expect(ctx).toContain("0.5rem")
			expect(ctx).toContain("0.375rem")
			expect(ctx).toContain("Token doc content")
		})

		it("does not include typography data", () => {
			const step: StepPlanEntry = {
				stepNumber: 2,
				stepType: "design-tokens",
				title: "Design Tokens",
				scope: "",
				dependencies: [1],
			}
			const ctx = injectContext(step, createAnalysis(), docsWithDesign)

			expect(ctx).not.toContain("Inter")
			expect(ctx).not.toContain("Font Families")
			expect(ctx).not.toContain("Typography doc content")
		})

		it("handles null tokens gracefully", () => {
			const step: StepPlanEntry = {
				stepNumber: 2,
				stepType: "design-tokens",
				title: "Design Tokens",
				scope: "",
				dependencies: [1],
			}
			const ctx = injectContext(step, createAnalysis({ designTokens: null }), emptyDocSet)

			expect(ctx).toContain("Color Tokens")
		})
	})

	describe("typography context", () => {
		it("includes font families, scale, weights, line heights", () => {
			const step: StepPlanEntry = {
				stepNumber: 3,
				stepType: "typography",
				title: "Typography",
				scope: "",
				dependencies: [2],
			}
			const ctx = injectContext(step, createAnalysis(), docsWithDesign)

			expect(ctx).toContain("Inter")
			expect(ctx).toContain("2.25rem")
			expect(ctx).toContain("700")
			expect(ctx).toContain("1.5")
			expect(ctx).toContain("Typography doc content")
		})

		it("does not include color tokens", () => {
			const step: StepPlanEntry = {
				stepNumber: 3,
				stepType: "typography",
				title: "Typography",
				scope: "",
				dependencies: [2],
			}
			const ctx = injectContext(step, createAnalysis(), docsWithDesign)

			expect(ctx).not.toContain("#3b82f6")
			expect(ctx).not.toContain("Token doc content")
		})
	})

	describe("layout-shell context", () => {
		it("includes layout approach, containers, grids, and navigation", () => {
			const step: StepPlanEntry = {
				stepNumber: 4,
				stepType: "layout-shell",
				title: "Layout Shell",
				scope: "",
				dependencies: [2, 3],
			}
			const ctx = injectContext(step, createAnalysis(), emptyDocSet)

			expect(ctx).toContain("CSS Grid + Flexbox")
			expect(ctx).toContain("1200px")
			expect(ctx).toContain("12 columns")
			expect(ctx).toContain("sidebar")
			expect(ctx).toContain("Grid-based")
		})
	})

	describe("showcase-pages context", () => {
		it("includes design essence, tokens, layout, and component catalog", () => {
			const step: StepPlanEntry = {
				stepNumber: 5,
				stepType: "showcase-pages",
				title: "Showcase Pages",
				scope: "",
				dependencies: [2, 3, 4],
			}
			const ctx = injectContext(step, createAnalysis(), emptyDocSet)

			expect(ctx).toContain("Modern SaaS dashboard")
			expect(ctx).toContain("#3b82f6")
			expect(ctx).toContain("CSS Grid + Flexbox")
			expect(ctx).toContain("Button")
			expect(ctx).not.toContain("Next.js")
			expect(ctx).not.toContain("Tailwind CSS")
		})
	})

	describe("responsive context", () => {
		it("includes breakpoints and patterns", () => {
			const step: StepPlanEntry = {
				stepNumber: 6,
				stepType: "responsive",
				title: "Responsive",
				scope: "",
				dependencies: [2, 5],
			}
			const ctx = injectContext(step, createAnalysis(), emptyDocSet)

			expect(ctx).toContain("mobile-first")
			expect(ctx).toContain("640px")
			expect(ctx).toContain("stack-to-grid")
		})
	})

	describe("interactions context", () => {
		it("includes animations, transitions, and gestures", () => {
			const step: StepPlanEntry = {
				stepNumber: 7,
				stepType: "interactions",
				title: "Interactions",
				scope: "",
				dependencies: [2, 5],
			}
			const ctx = injectContext(step, createAnalysis(), emptyDocSet)

			expect(ctx).toContain("fadeIn")
			expect(ctx).toContain("opacity")
			expect(ctx).toContain("200ms")
			expect(ctx).toContain("swipe")
		})
	})

	describe("generic context (unknown stepType)", () => {
		it("falls back to essence + all documents", () => {
			const step: StepPlanEntry = {
				stepNumber: 8,
				stepType: "setup",
				title: "Custom",
				scope: "",
				dependencies: [],
			}
			const customStep = { ...step, stepType: "unknown" as "setup" }
			const ctx = injectContext(customStep, createAnalysis(), docsWithDesign)

			expect(ctx).toContain("Modern SaaS dashboard")
			expect(ctx).toContain("Token doc content")
			expect(ctx).toContain("Component doc content")
		})
	})
})
