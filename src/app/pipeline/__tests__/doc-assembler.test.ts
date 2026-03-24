import { assembleDocuments } from "@app/pipeline/doc-assembler.js"
import type { AnalysisResult } from "@defs/analysis.js"
import type { EnvironmentProfile } from "@domain/rendering/resolve-environment.js"
import { describe, expect, it } from "vitest"

function createMockEnv(): EnvironmentProfile {
	return {
		mode: "existing-project",
		framework: "Next.js",
		language: "TypeScript",
		styling: "Tailwind CSS",
		buildTool: "Next.js built-in",
		uiLibrary: null,
		tokenStrategy: "CSS custom properties in globals.css + Tailwind theme.extend",
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

function createMockAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
	return {
		techStack: {
			framework: { value: "Next.js", confidence: "high" },
			language: { value: "TypeScript", confidence: "high" },
			styling: { value: { approach: "Tailwind CSS", tier: 1 }, confidence: "high" },
		},
		designTokens: {
			spacing: [{ name: "sm", value: "0.5rem", usage: "small gaps" }],
			borderRadius: [],
			shadows: [],
			breakpoints: [],
			zIndex: [],
		},
		typography: {
			fontFamilies: ["Inter"],
			scale: [{ name: "h1", fontSize: "2.5rem", usage: "main heading" }],
			lineHeights: [],
			fontWeights: [],
		},
		componentCatalog: {
			components: [
				{
					name: "Button",
					category: "atom",
					tier: "core",
					variants: [],
					description: "Button",
				},
			],
			patterns: [],
		},
		layoutSystem: null,
		pageStructures: null,
		responsiveStrategy: null,
		interactionPatterns: null,
		essence: {
			summary: "Test design system",
			designPhilosophy: "Minimalist",
			keyCharacteristics: ["Clean"],
			colorStrategy: "Monochrome",
			typographyStrategy: "Inter-based",
			layoutStrategy: "Grid",
			componentStrategy: "Atomic",
			interactionStrategy: "Subtle",
			appType: "marketing",
		},
		failedAnalyzers: [],
		...overrides,
	}
}

describe("assembleDocuments", () => {
	it("generates documents for aspects with data", () => {
		const result = assembleDocuments(createMockAnalysis(), createMockEnv(), "en", "/tmp/output")
		expect(result.documents.length).toBeGreaterThan(0)
		expect(result.documents.some((d) => d.filename.includes("design-tokens"))).toBe(true)
		expect(result.documents.some((d) => d.filename.includes("typography"))).toBe(true)
	})

	it("skips aspects with null data", () => {
		const result = assembleDocuments(
			createMockAnalysis({
				designTokens: null,
				typography: null,
			}),
			createMockEnv(),
			"en",
			"/tmp/output",
		)
		expect(result.documents.every((d) => !d.filename.includes("design-tokens"))).toBe(true)
		expect(result.documents.every((d) => !d.filename.includes("typography"))).toBe(true)
	})

	it("returns empty array when all aspects null", () => {
		const result = assembleDocuments(
			createMockAnalysis({
				designTokens: null,
				typography: null,
				componentCatalog: null,
				layoutSystem: null,
				pageStructures: null,
				responsiveStrategy: null,
				interactionPatterns: null,
			}),
			createMockEnv(),
			"en",
			"/tmp/output",
		)
		expect(result.documents).toHaveLength(0)
	})

	it("sets correct output directory", () => {
		const result = assembleDocuments(createMockAnalysis(), createMockEnv(), "en", "/tmp/docs")
		expect(result.outputDir).toBe("/tmp/docs")
	})
})
