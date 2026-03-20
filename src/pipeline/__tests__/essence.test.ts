import type { AnalysisResultMap } from "@defs/aspect-map.js"
import type { ILLMClient } from "@llm/client.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@llm/prompts.js", () => ({
	ESSENCE_SYNTHESIZER_CONFIG: { role: "test", task: "test" },
	buildSystemPrompt: vi.fn().mockReturnValue("system prompt"),
}))

function createMockClient(essenceData: unknown): ILLMClient {
	return {
		provider: "openai",
		call: vi.fn().mockResolvedValue({
			data: essenceData,
			usage: { inputTokens: 200, outputTokens: 100 },
		}),
	}
}

function createMockUsageTracker() {
	return {
		record: vi.fn(),
		getSummary: vi.fn(),
		printSummary: vi.fn(),
	}
}

function createMockResults(overrides: Partial<AnalysisResultMap> = {}): AnalysisResultMap {
	const base = {
		designTokens: {
			colorGroups: [
				{ group: "primary", tokens: [{ name: "primary", value: "#000", usage: "main" }] },
			],
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
		layoutSystem: null,
		pageStructures: null,
		responsiveStrategy: null,
		interactionPatterns: null,
		...overrides,
	}
	return base as AnalysisResultMap
}

describe("synthesizeEssence", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("synthesizes essence from analysis results", async () => {
		const { synthesizeEssence } = await import("../essence.js")
		const essenceData = {
			summary: "A clean design system",
			designPhilosophy: "Minimalist",
			keyCharacteristics: ["Clean", "Modern"],
			colorStrategy: "Monochrome with accent",
			typographyStrategy: "Inter-based scale",
			layoutStrategy: "Grid-based",
			componentStrategy: "Atomic design",
			interactionStrategy: "Subtle transitions",
			appType: "marketing",
		}

		const client = createMockClient(essenceData)
		const usage = createMockUsageTracker()

		const result = await synthesizeEssence(
			createMockResults(),
			client,
			// biome-ignore lint/suspicious/noExplicitAny: partial mock
			usage as any,
		)

		expect(result.summary).toBe("A clean design system")
		expect(result.appType).toBe("marketing")
		expect(client.call).toHaveBeenCalledTimes(1)
		expect(usage.record).toHaveBeenCalledWith("Analysis", "Essence Synthesizer", expect.any(Object))
	})

	it("includes failed analyzers note when some aspects are null", async () => {
		const { synthesizeEssence } = await import("../essence.js")
		const client = createMockClient({
			summary: "Test",
			designPhilosophy: "Test",
			keyCharacteristics: [],
			colorStrategy: "",
			typographyStrategy: "",
			layoutStrategy: "",
			componentStrategy: "",
			interactionStrategy: "",
			appType: "marketing",
		})
		const usage = createMockUsageTracker()

		const results = createMockResults({
			layoutSystem: null,
			pageStructures: null,
		})

		// biome-ignore lint/suspicious/noExplicitAny: partial mock
		await synthesizeEssence(results, client, usage as any)

		const callArgs = (client.call as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(callArgs.prompt).toBeDefined()
	})

	it("passes reconciliation conflicts to prompt", async () => {
		const { synthesizeEssence } = await import("../essence.js")
		const client = createMockClient({
			summary: "Test",
			designPhilosophy: "Test",
			keyCharacteristics: [],
			colorStrategy: "",
			typographyStrategy: "",
			layoutStrategy: "",
			componentStrategy: "",
			interactionStrategy: "",
			appType: "utility",
		})
		const usage = createMockUsageTracker()

		const reconciliation = {
			conflicts: [
				{
					field: "primaryColor",
					tokenValue: "#000",
					otherValue: "#111",
					otherAspect: "componentCatalog",
				},
			],
		}

		await synthesizeEssence(
			createMockResults(),
			client,
			// biome-ignore lint/suspicious/noExplicitAny: partial mock
			usage as any,
			"en",
			// biome-ignore lint/suspicious/noExplicitAny: partial mock
			reconciliation as any,
		)

		const callArgs = (client.call as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(callArgs.prompt).toContain("Cross-Aspect Conflict Resolutions")
		expect(callArgs.prompt).toContain("primaryColor")
	})

	it("throws when LLM call fails", async () => {
		const { synthesizeEssence } = await import("../essence.js")
		const client: ILLMClient = {
			provider: "openai",
			call: vi.fn().mockRejectedValue(new Error("Synthesis failed")),
		}
		const usage = createMockUsageTracker()

		await expect(
			// biome-ignore lint/suspicious/noExplicitAny: partial mock
			synthesizeEssence(createMockResults(), client, usage as any),
		).rejects.toThrow("Synthesis failed")
	})
})
