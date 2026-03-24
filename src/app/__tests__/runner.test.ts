import type { AspectDescriptor } from "@defs/descriptor.js"
import type { ILLMClient } from "@infra/llm/client.js"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Mock modules
vi.mock("@domain/analysis/context-builder.js", () => ({
	buildContext: vi.fn().mockReturnValue({
		codeContext: "const x = 1",
		fileStructure: "src/\n  app/",
		totalTokenEstimate: 100,
	}),
}))

vi.mock("@domain/llm-prompts/index.js", () => ({
	ANALYSIS_PRINCIPLES: ["principle1"],
	buildSystemPrompt: vi.fn().mockReturnValue("system prompt"),
	ESSENCE_SYNTHESIZER_CONFIG: { role: "test", task: "test" },
}))

vi.mock("@infra/logger.js", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}))

const testSchema = z.object({ name: z.string() })

function createMockClient(mockData: unknown = { name: "test" }): ILLMClient {
	return {
		provider: "openai",
		call: vi.fn().mockResolvedValue({
			data: mockData,
			usage: { inputTokens: 100, outputTokens: 50 },
		}),
	}
}

function createMockUsageTracker() {
	return {
		record: vi.fn(),
		getSummary: vi.fn().mockReturnValue({
			totalCalls: 1,
			totalInputTokens: 100,
			totalOutputTokens: 50,
			totalTokens: 150,
			records: [],
		}),
		printSummary: vi.fn(),
	}
}

const mockCodeChunks: import("@defs/extraction.js").CodeChunk[] = []
const mockFileTree: import("@defs/extraction.js").FileTreeNode[] = []

function createMockDescriptor(): AspectDescriptor<"designTokens"> {
	return {
		name: "designTokens",
		displayName: "Design Tokens",
		analyzer: {
			preset: "tokenAnalyzer",
			// biome-ignore lint/suspicious/noExplicitAny: simplified test schema
			schema: testSchema as any,
			schemaName: "TestSchema",
			schemaDescription: "Test",
			promptConfig: {
				role: "test role",
				task: "test task",
			},
		},
		planning: {
			docs: [],
			planSteps: () => [],
		},
	}
}

describe("runAnalyzer", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("calls LLM and returns data", async () => {
		const { runAnalyzer } = await import("../runner.js")
		const client = createMockClient({ name: "result" })
		const usage = createMockUsageTracker()
		const descriptor = createMockDescriptor()

		const result = await runAnalyzer(
			descriptor,
			mockCodeChunks,
			mockFileTree,
			client,
			// biome-ignore lint/suspicious/noExplicitAny: partial mock
			usage as any,
			"en",
			{ filePaths: [] },
		)

		expect(result).toEqual({ name: "result" })
		expect(client.call).toHaveBeenCalledTimes(1)
		expect(usage.record).toHaveBeenCalledWith("Analysis", "Design Tokens", expect.any(Object))
	})

	it("throws when LLM call fails", async () => {
		const { runAnalyzer } = await import("../runner.js")
		const client: ILLMClient = {
			provider: "openai",
			call: vi.fn().mockRejectedValue(new Error("LLM failed")),
		}
		const usage = createMockUsageTracker()

		await expect(
			runAnalyzer(
				createMockDescriptor(),
				mockCodeChunks,
				mockFileTree,
				client,
				// biome-ignore lint/suspicious/noExplicitAny: partial mock
				usage as any,
				"en",
				{ filePaths: [] },
			),
		).rejects.toThrow("LLM failed")
	})

	it("uses filePaths when provided in options", async () => {
		const { runAnalyzer } = await import("../runner.js")
		const { buildContext } = await import("@domain/analysis/context-builder.js")
		const client = createMockClient({ name: "file-list-result" })
		const usage = createMockUsageTracker()
		const descriptor = createMockDescriptor()

		const result = await runAnalyzer(
			descriptor,
			mockCodeChunks,
			mockFileTree,
			client,
			// biome-ignore lint/suspicious/noExplicitAny: partial mock
			usage as any,
			"en",
			{ filePaths: ["src/Button.tsx"] },
		)

		expect(result).toEqual({ name: "file-list-result" })
		expect(buildContext).toHaveBeenCalledWith(expect.any(Array), expect.any(Array), {
			filePaths: ["src/Button.tsx"],
		})
		expect(client.call).toHaveBeenCalledTimes(1)
	})

	it("includes crossAspectContext in prompt when provided", async () => {
		const { runAnalyzer } = await import("../runner.js")
		const client = createMockClient({ name: "cross-ctx-result" })
		const usage = createMockUsageTracker()
		const descriptor = createMockDescriptor()

		await runAnalyzer(
			descriptor,
			mockCodeChunks,
			mockFileTree,
			client,
			// biome-ignore lint/suspicious/noExplicitAny: partial mock
			usage as any,
			"en",
			{ filePaths: [], crossAspectContext: "## Prior Results\n- 12 color tokens" },
		)

		expect(client.call).toHaveBeenCalledTimes(1)
		const callArgs = (client.call as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(callArgs.prompt).toContain("## Prior Results")
		expect(callArgs.prompt).toContain("12 color tokens")
	})

	it("passes output language to system prompt builder", async () => {
		const { runAnalyzer } = await import("../runner.js")
		const { buildSystemPrompt } = await import("@domain/llm-prompts/index.js")
		const client = createMockClient()
		const usage = createMockUsageTracker()

		await runAnalyzer(
			createMockDescriptor(),
			mockCodeChunks,
			mockFileTree,
			client,
			// biome-ignore lint/suspicious/noExplicitAny: partial mock
			usage as any,
			"ko",
			{ filePaths: [] },
		)

		expect(buildSystemPrompt).toHaveBeenCalledWith(
			expect.objectContaining({ outputLanguage: "ko" }),
		)
	})
})
