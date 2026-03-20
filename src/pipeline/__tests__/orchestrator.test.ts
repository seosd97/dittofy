import type { AnalysisResult, DesignEssence } from "@defs/analysis.js"
import type { AnalysisResultMap } from "@defs/aspect-map.js"
import type { DittoConfig } from "@defs/config.js"
import type { ILLMClient } from "@llm/client.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Module mocks ────────────────────────────────────────────

vi.mock("@source/workspace-detector.js", () => ({
	findMonorepoRoot: vi.fn().mockResolvedValue(null),
	resolveWorkspaceDeps: vi.fn().mockResolvedValue([]),
	detectApps: vi.fn().mockResolvedValue([]),
}))

vi.mock("@source/repo-resolver.js", () => ({
	resolveRepo: vi.fn().mockResolvedValue({
		localPath: "/tmp/test-repo",
		source: ".",
		projectName: "test-repo",
		isTemporary: false,
		cleanup: vi.fn(),
	}),
}))

vi.mock("@source/index.js", () => ({
	runExtraction: vi.fn().mockResolvedValue({
		status: "completed",
		data: {
			extraction: {
				projectMeta: {
					name: "test-project",
					packageManager: "npm",
					dependencies: {},
					devDependencies: {},
					scripts: {},
				},
				fileTree: [
					{
						path: "src",
						type: "directory",
						children: [{ path: "Button.tsx", type: "file", extension: ".tsx", size: 30 }],
					},
				],
			},
			techStack: {
				framework: { value: "Next.js", confidence: "high" },
				language: { value: "TypeScript", confidence: "high" },
				styling: {
					value: { approach: "Tailwind CSS", tier: 1 },
					confidence: "high",
				},
			},
			monorepo: {
				isMonorepo: false,
				rootPath: "/tmp/test-repo",
				targetPath: "/tmp/test-repo",
				targetRelative: "",
			},
		},
		errors: [],
		duration: 100,
	}),
}))

vi.mock("@output/docs.js", () => ({
	writeDocuments: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@output/prompts.js", () => ({
	writePrompts: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@utils/fs.js", () => ({
	ensureDir: vi.fn().mockResolvedValue(undefined),
	writeFileContent: vi.fn().mockResolvedValue(undefined),
	readFileContent: vi.fn().mockImplementation(async () => {
		return JSON.stringify(createMockAnalysisResult())
	}),
}))

vi.mock("@utils/logger.js", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
	},
	phaseStart: vi.fn(),
	phaseSuccess: vi.fn(),
	phaseFail: vi.fn(),
}))

vi.mock("@pipeline/assembly/index.js", () => ({
	assembleDocuments: vi.fn().mockReturnValue({
		documents: [{ filename: "tokens.md", title: "Tokens", content: "# Tokens", category: "spec" }],
		outputDir: "/tmp/output/design-spec",
	}),
	assemblePrompts: vi.fn().mockReturnValue({
		steps: [{ filename: "01-setup.md", content: "# Setup", stepNumber: 1, title: "Setup" }],
		outputDir: "/tmp/output/prompts",
		readme: "# README",
	}),
	resolveEnvironment: vi.fn().mockReturnValue({
		framework: "Next.js",
		language: "TypeScript",
		styling: { approach: "Tailwind CSS", tier: 1 },
		structure: {
			srcDir: "src",
			componentDir: "src/components",
			pageDir: "src/pages",
			styleDir: "src/styles",
		},
	}),
}))

vi.mock("@pipeline/workspace.js", () => ({
	createWorkspace: vi.fn().mockResolvedValue({
		tmpDir: "/tmp/output/.tmp",
		writeMarkdown: vi.fn().mockResolvedValue(undefined),
		writeJSON: vi.fn().mockResolvedValue(undefined),
		readMarkdown: vi.fn().mockResolvedValue(""),
		readJSON: vi.fn().mockResolvedValue({}),
		exists: vi.fn().mockResolvedValue(false),
		cleanup: vi.fn().mockResolvedValue(undefined),
	}),
}))

vi.mock("@pipeline/planner.js", () => ({
	planAnalysis: vi.fn().mockResolvedValue({
		projectSummary: "Test project",
		aspects: [
			"designTokens",
			"typography",
			"componentCatalog",
			"layoutSystem",
			"pageStructures",
			"responsiveStrategy",
			"interactionPatterns",
		],
		waves: [
			{ order: 1, aspects: ["designTokens"] },
			{ order: 2, aspects: ["typography", "layoutSystem"] },
			{
				order: 3,
				aspects: [
					"componentCatalog",
					"pageStructures",
					"responsiveStrategy",
					"interactionPatterns",
				],
			},
		],
		fileSelection: {},
	}),
}))

vi.mock("@pipeline/wave-executor.js", () => ({
	executeWaves: vi.fn().mockResolvedValue({
		results: createMockAnalysisResultMap(),
		failedAnalyzers: [],
	}),
}))

vi.mock("@pipeline/essence.js", () => ({
	synthesizeEssence: vi.fn().mockResolvedValue(createMockEssence()),
}))

vi.mock("@pipeline/reconciliation.js", () => ({
	reconcileAnalysis: vi.fn().mockReturnValue({
		conflicts: [],
		resolutions: [],
	}),
}))

// ── Helpers ─────────────────────────────────────────────────

function createMockAspectData(aspectName: string): unknown {
	switch (aspectName) {
		case "designTokens":
			return {
				spacing: [],
				borderRadius: [],
				shadows: [],
				breakpoints: [],
				zIndex: [],
			}
		case "typography":
			return {
				fontFamilies: ["Inter"],
				scale: [],
				lineHeights: [],
				fontWeights: [],
			}
		case "componentCatalog":
			return { components: [], patterns: [] }
		case "layoutSystem":
			return {
				approach: "Flexbox",
				containers: [],
				grids: [],
				navigation: [],
			}
		case "pageStructures":
			return { pages: [] }
		case "responsiveStrategy":
			return { breakpoints: [], patterns: [] }
		case "interactionPatterns":
			return { animations: [], transitions: [], gestures: [] }
		default:
			return {}
	}
}

function createMockAnalysisResultMap(): AnalysisResultMap {
	return {
		designTokens: createMockAspectData("designTokens") as AnalysisResultMap["designTokens"],
		typography: createMockAspectData("typography") as AnalysisResultMap["typography"],
		componentCatalog: createMockAspectData(
			"componentCatalog",
		) as AnalysisResultMap["componentCatalog"],
		layoutSystem: createMockAspectData("layoutSystem") as AnalysisResultMap["layoutSystem"],
		pageStructures: createMockAspectData("pageStructures") as AnalysisResultMap["pageStructures"],
		responsiveStrategy: createMockAspectData(
			"responsiveStrategy",
		) as AnalysisResultMap["responsiveStrategy"],
		interactionPatterns: createMockAspectData(
			"interactionPatterns",
		) as AnalysisResultMap["interactionPatterns"],
	}
}

function createMockEssence(): DesignEssence {
	return {
		summary: "Test essence",
		designPhilosophy: "Test",
		keyCharacteristics: ["test"],
		colorStrategy: "test",
		typographyStrategy: "test",
		layoutStrategy: "test",
		componentStrategy: "test",
		interactionStrategy: "test",
		appType: "marketing",
	}
}

function createMockAnalysisResult(): AnalysisResult {
	return {
		techStack: {
			framework: { value: "Next.js", confidence: "high" },
			language: { value: "TypeScript", confidence: "high" },
			styling: {
				value: { approach: "Tailwind CSS", tier: 1 },
				confidence: "high",
			},
		},
		designTokens: createMockAspectData("designTokens") as AnalysisResult["designTokens"],
		typography: createMockAspectData("typography") as AnalysisResult["typography"],
		componentCatalog: createMockAspectData(
			"componentCatalog",
		) as AnalysisResult["componentCatalog"],
		layoutSystem: createMockAspectData("layoutSystem") as AnalysisResult["layoutSystem"],
		pageStructures: createMockAspectData("pageStructures") as AnalysisResult["pageStructures"],
		responsiveStrategy: createMockAspectData(
			"responsiveStrategy",
		) as AnalysisResult["responsiveStrategy"],
		interactionPatterns: createMockAspectData(
			"interactionPatterns",
		) as AnalysisResult["interactionPatterns"],
		essence: createMockEssence(),
		failedAnalyzers: [],
	}
}

function createMockConfig(): DittoConfig {
	return {
		output: "/tmp/output",
		language: "en",
		model: "gpt-4o",
		provider: "openai",
		apiKeys: { openai: "test-key" },
		docsOnly: false,
		promptsOnly: false,
	}
}

function createMockLLMClient(): ILLMClient {
	return {
		provider: "openai",
		call: vi.fn().mockImplementation(async (params: { schemaName: string }) => {
			return {
				data: createMockAspectData(params.schemaName) ?? {},
				usage: { inputTokens: 100, outputTokens: 50 },
			}
		}),
	}
}

// ── Tests ───────────────────────────────────────────────────

describe("orchestrator", () => {
	beforeEach(async () => {
		vi.clearAllMocks()
		// Re-apply default mock implementations after clearAllMocks
		const { findMonorepoRoot } = await import("@source/workspace-detector.js")
		vi.mocked(findMonorepoRoot).mockResolvedValue(null)

		const { synthesizeEssence } = await import("@pipeline/essence.js")
		vi.mocked(synthesizeEssence).mockResolvedValue(createMockEssence())

		const { resolveRepo } = await import("@source/repo-resolver.js")
		vi.mocked(resolveRepo).mockResolvedValue({
			localPath: "/tmp/test-repo",
			source: ".",
			projectName: "test-repo",
			isTemporary: false,
			cleanup: vi.fn(),
		})

		const { runExtraction } = await import("@source/index.js")
		vi.mocked(runExtraction).mockResolvedValue({
			status: "completed",
			data: {
				extraction: {
					projectMeta: {
						name: "test-project",
						packageManager: "npm",
						dependencies: {},
						devDependencies: {},
						scripts: {},
					},
					fileTree: [
						{
							path: "src",
							type: "directory",
							children: [{ path: "Button.tsx", type: "file", extension: ".tsx", size: 30 }],
						},
					],
				},
				techStack: {
					framework: { value: "Next.js", confidence: "high" },
					language: { value: "TypeScript", confidence: "high" },
					styling: {
						value: { approach: "Tailwind CSS", tier: 1 },
						confidence: "high",
					},
				},
				monorepo: {
					isMonorepo: false,
					rootPath: "/tmp/test-repo",
					targetPath: "/tmp/test-repo",
					targetRelative: "",
				},
			},
			errors: [],
			duration: 100,
		} as never)

		const { createWorkspace } = await import("@pipeline/workspace.js")
		vi.mocked(createWorkspace).mockResolvedValue({
			tmpDir: "/tmp/output/.tmp",
			writeMarkdown: vi.fn().mockResolvedValue(undefined),
			writeJSON: vi.fn().mockResolvedValue(undefined),
			readMarkdown: vi.fn().mockResolvedValue(""),
			readJSON: vi.fn().mockResolvedValue({}),
			exists: vi.fn().mockResolvedValue(false),
			cleanup: vi.fn().mockResolvedValue(undefined),
		})

		const { planAnalysis } = await import("@pipeline/planner.js")
		vi.mocked(planAnalysis).mockResolvedValue({
			projectSummary: "Test project",
			aspects: [
				"designTokens",
				"typography",
				"componentCatalog",
				"layoutSystem",
				"pageStructures",
				"responsiveStrategy",
				"interactionPatterns",
			],
			waves: [
				{ order: 1, aspects: ["designTokens"] },
				{ order: 2, aspects: ["typography", "layoutSystem"] },
				{
					order: 3,
					aspects: [
						"componentCatalog",
						"pageStructures",
						"responsiveStrategy",
						"interactionPatterns",
					],
				},
			],
			fileSelection: {},
		})

		const { executeWaves } = await import("@pipeline/wave-executor.js")
		vi.mocked(executeWaves).mockResolvedValue({
			results: createMockAnalysisResultMap(),
			failedAnalyzers: [],
		})
	})

	describe("runAnalysisPipeline", () => {
		it("succeeds with all analyzers passing", async () => {
			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(true)
			expect(result.analysisJsonPath).toContain("analysis.json")
			expect(result.errors).toEqual([])
			expect(result.duration).toBeGreaterThanOrEqual(0)
		})

		it("calls resolveRepo and runExtraction", async () => {
			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const { resolveRepo } = await import("@source/repo-resolver.js")
			const { runExtraction } = await import("@source/index.js")

			const client = createMockLLMClient()
			await runAnalysisPipeline(".", createMockConfig(), { llmClient: client })

			expect(resolveRepo).toHaveBeenCalledWith(".")
			expect(runExtraction).toHaveBeenCalledWith("/tmp/test-repo", undefined)
		})

		it("creates workspace and calls planAnalysis", async () => {
			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const { createWorkspace } = await import("@pipeline/workspace.js")
			const { planAnalysis } = await import("@pipeline/planner.js")

			const client = createMockLLMClient()
			await runAnalysisPipeline(".", createMockConfig(), { llmClient: client })

			expect(createWorkspace).toHaveBeenCalled()
			expect(planAnalysis).toHaveBeenCalled()
		})

		it("calls executeWaves with plan", async () => {
			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const { executeWaves } = await import("@pipeline/wave-executor.js")

			const client = createMockLLMClient()
			await runAnalysisPipeline(".", createMockConfig(), { llmClient: client })

			expect(executeWaves).toHaveBeenCalledWith(
				expect.objectContaining({
					plan: expect.objectContaining({
						aspects: expect.arrayContaining(["designTokens"]),
						waves: expect.any(Array),
					}),
					concurrency: 3,
				}),
			)
		})

		it("writes analysis.json on success", async () => {
			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const { writeFileContent } = await import("@utils/fs.js")

			const client = createMockLLMClient()
			await runAnalysisPipeline(".", createMockConfig(), { llmClient: client })

			expect(writeFileContent).toHaveBeenCalledWith(
				expect.stringContaining("analysis.json"),
				expect.any(String),
			)
		})

		it("returns usage summary", async () => {
			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.usage).toBeDefined()
			expect(result.usage?.totalCalls).toBeGreaterThanOrEqual(0)
		})

		it("fails when extraction finds no files", async () => {
			const { runExtraction } = await import("@source/index.js")
			vi.mocked(runExtraction).mockResolvedValueOnce({
				status: "completed",
				data: {
					extraction: {
						projectMeta: {
							name: "test-project",
							packageManager: "npm",
							dependencies: {},
							devDependencies: {},
							scripts: {},
						},
						fileTree: [],
					},
					techStack: {
						framework: { value: "Next.js", confidence: "high" },
						language: { value: "TypeScript", confidence: "high" },
						styling: {
							value: { approach: "Tailwind CSS", tier: 1 },
							confidence: "high",
						},
					},
					monorepo: {
						isMonorepo: false,
						rootPath: "/tmp/test-repo",
						targetPath: "/tmp/test-repo",
						targetRelative: "",
					},
				},
				errors: [],
				duration: 100,
			} as never)

			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(false)
		})

		it("fails when extraction fails", async () => {
			const { runExtraction } = await import("@source/index.js")
			vi.mocked(runExtraction).mockRejectedValueOnce(new Error("Extraction error"))

			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)
		})

		it("succeeds with some non-critical analyzers failing", async () => {
			const { executeWaves } = await import("@pipeline/wave-executor.js")
			const results = createMockAnalysisResultMap()
			results.pageStructures = null
			results.interactionPatterns = null
			vi.mocked(executeWaves).mockResolvedValueOnce({
				results,
				failedAnalyzers: ["pageStructures", "interactionPatterns"],
			})

			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			// Non-critical failures (enrichment tier) should still succeed
			expect(result.success).toBe(true)
		})

		it("fails when designTokens analyzer fails (critical)", async () => {
			const { executeWaves } = await import("@pipeline/wave-executor.js")
			const results = createMockAnalysisResultMap()
			results.designTokens = null
			vi.mocked(executeWaves).mockResolvedValueOnce({
				results,
				failedAnalyzers: ["designTokens"],
			})

			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(false)
		})

		it("fails when essence synthesis fails", async () => {
			const { synthesizeEssence } = await import("@pipeline/essence.js")
			vi.mocked(synthesizeEssence).mockRejectedValueOnce(new Error("Essence synthesis failed"))

			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(false)
		})

		it("calls cleanup even on failure", async () => {
			const { resolveRepo } = await import("@source/repo-resolver.js")
			const cleanupFn = vi.fn()
			vi.mocked(resolveRepo).mockResolvedValueOnce({
				localPath: "/tmp/test-repo",
				source: ".",
				projectName: "test-repo",
				isTemporary: false,
				cleanup: cleanupFn,
			})

			const { runExtraction } = await import("@source/index.js")
			vi.mocked(runExtraction).mockRejectedValueOnce(new Error("Extraction error"))

			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const client = createMockLLMClient()
			await runAnalysisPipeline(".", createMockConfig(), { llmClient: client })

			expect(cleanupFn).toHaveBeenCalled()
		})

		it("cleans up workspace even on failure", async () => {
			const { createWorkspace } = await import("@pipeline/workspace.js")
			const workspaceCleanup = vi.fn().mockResolvedValue(undefined)
			vi.mocked(createWorkspace).mockResolvedValueOnce({
				tmpDir: "/tmp/output/.tmp",
				writeMarkdown: vi.fn().mockResolvedValue(undefined),
				writeJSON: vi.fn().mockResolvedValue(undefined),
				readMarkdown: vi.fn().mockResolvedValue(""),
				readJSON: vi.fn().mockResolvedValue({}),
				exists: vi.fn().mockResolvedValue(false),
				cleanup: workspaceCleanup,
			})

			const { runExtraction } = await import("@source/index.js")
			vi.mocked(runExtraction).mockRejectedValueOnce(new Error("Extraction error"))

			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const client = createMockLLMClient()
			await runAnalysisPipeline(".", createMockConfig(), { llmClient: client })

			expect(workspaceCleanup).toHaveBeenCalled()
		})

		it("detects monorepo and passes monorepoInfo to runExtraction", async () => {
			const { findMonorepoRoot } = await import("@source/workspace-detector.js")
			vi.mocked(findMonorepoRoot).mockResolvedValueOnce("/tmp/monorepo-root")

			const { runExtraction } = await import("@source/index.js")

			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(true)
			expect(findMonorepoRoot).toHaveBeenCalled()
			expect(runExtraction).toHaveBeenCalledWith("/tmp/test-repo", {
				rootPath: "/tmp/monorepo-root",
				targetRelative: expect.any(String),
				depPaths: [],
			})
		})

		it("fails when planning fails", async () => {
			const { planAnalysis } = await import("@pipeline/planner.js")
			vi.mocked(planAnalysis).mockRejectedValueOnce(new Error("Planning failed"))

			const { runAnalysisPipeline } = await import("@pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(false)
			expect(result.errors.some((e) => e.message.includes("Planning failed"))).toBe(true)
		})
	})

	describe("runGeneratePipeline", () => {
		it("generates docs and prompts by default", async () => {
			const { runGeneratePipeline } = await import("@pipeline/orchestrator.js")
			const { writeDocuments } = await import("@output/docs.js")
			const { writePrompts } = await import("@output/prompts.js")

			const result = await runGeneratePipeline({
				analysisPath: "/tmp/analysis.json",
				output: "/tmp/output",
				language: "en",
			})

			expect(result.success).toBe(true)
			expect(writeDocuments).toHaveBeenCalled()
			expect(writePrompts).toHaveBeenCalled()
		})

		it("skips prompts when docsOnly=true", async () => {
			const { runGeneratePipeline } = await import("@pipeline/orchestrator.js")
			const { writePrompts } = await import("@output/prompts.js")

			const result = await runGeneratePipeline({
				analysisPath: "/tmp/analysis.json",
				output: "/tmp/output",
				language: "en",
				docsOnly: true,
			})

			expect(result.success).toBe(true)
			expect(writePrompts).not.toHaveBeenCalled()
		})

		it("skips docs when promptsOnly=true", async () => {
			const { runGeneratePipeline } = await import("@pipeline/orchestrator.js")
			const { writeDocuments } = await import("@output/docs.js")

			const result = await runGeneratePipeline({
				analysisPath: "/tmp/analysis.json",
				output: "/tmp/output",
				language: "en",
				promptsOnly: true,
			})

			expect(result.success).toBe(true)
			expect(writeDocuments).not.toHaveBeenCalled()
		})

		it("reads analysis.json from the specified path", async () => {
			const { runGeneratePipeline } = await import("@pipeline/orchestrator.js")
			const { readFileContent } = await import("@utils/fs.js")

			await runGeneratePipeline({
				analysisPath: "/tmp/my-analysis.json",
				output: "/tmp/output",
				language: "en",
			})

			expect(readFileContent).toHaveBeenCalledWith("/tmp/my-analysis.json")
		})

		it("returns duration", async () => {
			const { runGeneratePipeline } = await import("@pipeline/orchestrator.js")

			const result = await runGeneratePipeline({
				analysisPath: "/tmp/analysis.json",
				output: "/tmp/output",
				language: "en",
			})

			expect(result.duration).toBeGreaterThanOrEqual(0)
		})
	})

	describe("runPipeline", () => {
		it("runs both analysis and generate phases", async () => {
			const { runPipeline } = await import("@pipeline/orchestrator.js")
			const { writeDocuments } = await import("@output/docs.js")
			const { writePrompts } = await import("@output/prompts.js")
			const { writeFileContent } = await import("@utils/fs.js")

			const result = await runPipeline(".", createMockConfig())

			expect(result.success).toBe(true)
			// analysis.json should have been written
			expect(writeFileContent).toHaveBeenCalledWith(
				expect.stringContaining("analysis.json"),
				expect.any(String),
			)
			// docs and prompts should have been generated
			expect(writeDocuments).toHaveBeenCalled()
			expect(writePrompts).toHaveBeenCalled()
		})

		it("stops at analysis if it fails", async () => {
			const { runExtraction } = await import("@source/index.js")
			vi.mocked(runExtraction).mockRejectedValueOnce(new Error("Extraction error"))

			const { runPipeline } = await import("@pipeline/orchestrator.js")
			const { writeDocuments } = await import("@output/docs.js")

			const result = await runPipeline(".", createMockConfig())

			expect(result.success).toBe(false)
			expect(writeDocuments).not.toHaveBeenCalled()
		})

		it("passes docsOnly/promptsOnly from config", async () => {
			const { runPipeline } = await import("@pipeline/orchestrator.js")
			const { writePrompts } = await import("@output/prompts.js")

			const config = createMockConfig()
			config.docsOnly = true

			const result = await runPipeline(".", config)

			expect(result.success).toBe(true)
			expect(writePrompts).not.toHaveBeenCalled()
		})
	})
})
