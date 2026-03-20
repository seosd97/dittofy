import type { AnalysisResult } from "@defs/analysis.js"
import { assemblePrompts } from "@pipeline/assembly/prompt-assembler.js"
import { describe, expect, it } from "vitest"

// Reuse the same mock helpers as doc-assembler test
function createMockEnv() {
	return {
		mode: "existing-project" as const,
		framework: "Next.js",
		language: "TypeScript",
		styling: "Tailwind CSS",
		buildTool: "Next.js built-in",
		uiLibrary: null,
		tokenStrategy: "CSS custom properties",
		summary: "Next.js + TypeScript + Tailwind CSS",
		structure: {
			stylesDir: "src/styles",
			tokensFile: "src/styles/tokens.css",
			globalsFile: "src/styles/globals.css",
			layoutDir: "src/components/layout",
			uiDir: "src/components/ui",
			pagesDir: "src/app",
			utilsDir: "src/lib",
			rootLayout: "src/app/layout.tsx",
			stylingConfig: "tailwind.config.ts",
			componentExt: ".tsx",
			scriptExt: ".ts",
			layoutFiles: {
				header: "src/components/layout/Header.tsx",
				footer: "src/components/layout/Footer.tsx",
				navigation: "src/components/layout/Navigation.tsx",
				pageContainer: "src/components/layout/PageContainer.tsx",
			},
			pageFiles: {
				home: "src/app/page.tsx",
				about: "src/app/about/page.tsx",
			},
			utilFiles: {
				cn: "src/lib/utils/cn.ts",
				animations: "src/lib/utils/animations.ts",
			},
			styleFiles: {
				componentStylePattern: "Tailwind utility classes",
				animations: "src/styles/animations.css",
			},
		},
	}
}

function createMockAnalysis(): AnalysisResult {
	return {
		techStack: {
			framework: { value: "Next.js", confidence: "high" },
			language: { value: "TypeScript", confidence: "high" },
			styling: { value: { approach: "Tailwind CSS", tier: 1 }, confidence: "high" },
		},
		designTokens: {
			spacing: [{ name: "sm", value: "0.5rem", usage: "gaps" }],
			borderRadius: [],
			shadows: [],
			breakpoints: [],
			zIndex: [],
		},
		typography: {
			fontFamilies: ["Inter"],
			scale: [{ name: "h1", fontSize: "2.5rem", usage: "heading" }],
			lineHeights: [],
			fontWeights: [],
		},
		componentCatalog: { components: [], patterns: [] },
		layoutSystem: null,
		pageStructures: null,
		responsiveStrategy: null,
		interactionPatterns: null,
		essence: {
			summary: "Test design",
			designPhilosophy: "Minimalist",
			keyCharacteristics: ["Clean"],
			colorStrategy: "Monochrome",
			typographyStrategy: "Inter",
			layoutStrategy: "Grid",
			componentStrategy: "Atomic",
			interactionStrategy: "Subtle",
			appType: "marketing",
		},
		failedAnalyzers: [],
	}
}

describe("assemblePrompts", () => {
	it("generates prompts with setup, design-tokens, typography, and showcase-pages", () => {
		const result = assemblePrompts(createMockAnalysis(), createMockEnv(), "en", "/tmp/prompts")
		expect(result.steps.length).toBeGreaterThanOrEqual(4)
		expect(result.steps[0].stepType).toBe("setup")
		expect(result.steps.some((s) => s.stepType === "design-tokens")).toBe(true)
		expect(result.steps.some((s) => s.stepType === "typography")).toBe(true)
		expect(result.steps.some((s) => s.stepType === "showcase-pages")).toBe(true)
	})

	it("generates a readme", () => {
		const result = assemblePrompts(createMockAnalysis(), createMockEnv(), "en", "/tmp/prompts")
		expect(result.readme).toBeTruthy()
		expect(result.readme.length).toBeGreaterThan(0)
	})

	it("assigns sequential step numbers", () => {
		const result = assemblePrompts(createMockAnalysis(), createMockEnv(), "en", "/tmp/prompts")
		for (let i = 0; i < result.steps.length; i++) {
			expect(result.steps[i].stepNumber).toBe(i + 1)
		}
	})

	it("estimates complexity for each step", () => {
		const result = assemblePrompts(createMockAnalysis(), createMockEnv(), "en", "/tmp/prompts")
		for (const step of result.steps) {
			expect(["low", "medium", "high"]).toContain(step.estimatedComplexity)
		}
	})
})
