import type { AnalysisResult, DesignEssence } from "@defs/analysis.js"
import type { AnalysisResultMap } from "@defs/aspect-map.js"
import type { DittoConfig } from "@defs/config.js"
import { UserError } from "@defs/errors.js"
import type { ILLMClient } from "@infra/llm/client.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ── Module mocks ────────────────────────────────────────────

vi.mock("node:fs/promises", () => ({
	access: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@domain/constants/target-presets.js", () => ({
	listTargetPresets: vi
		.fn()
		.mockReturnValue(["next-tailwind", "react-css-modules", "vue-css", "svelte-tailwind"]),
	getTargetPreset: vi.fn(),
}))

vi.mock("@infra/source/workspace-detector.js", () => ({
	findMonorepoRoot: vi.fn().mockResolvedValue(null),
	resolveWorkspaceDeps: vi.fn().mockResolvedValue([]),
	detectApps: vi.fn().mockResolvedValue([]),
}))

vi.mock("@infra/source/repo-resolver.js", () => ({
	resolveRepo: vi.fn().mockResolvedValue({
		localPath: "/tmp/test-repo",
		source: ".",
		projectName: "test-repo",
		isTemporary: false,
		cleanup: vi.fn(),
	}),
}))

vi.mock("@infra/source/index.js", () => ({
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

vi.mock("@infra/output/docs.js", () => ({
	writeDocuments: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@infra/output/prompts.js", () => ({
	writePrompts: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@infra/fs.js", () => ({
	ensureDir: vi.fn().mockResolvedValue(undefined),
	writeFileContent: vi.fn().mockResolvedValue(undefined),
	readFileContent: vi.fn().mockImplementation(async () => {
		return JSON.stringify(createMockAnalysisResult())
	}),
}))

vi.mock("@infra/logger.js", () => ({
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

vi.mock("@domain/rendering/resolve-environment.js", () => ({
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

vi.mock("@app/pipeline/doc-assembler.js", () => ({
	assembleDocuments: vi.fn().mockReturnValue({
		documents: [{ filename: "tokens.md", title: "Tokens", content: "# Tokens", category: "spec" }],
		outputDir: "/tmp/output/design-spec",
	}),
}))

vi.mock("@app/pipeline/prompt-assembler.js", () => ({
	assemblePrompts: vi.fn().mockReturnValue({
		steps: [{ filename: "01-setup.md", content: "# Setup", stepNumber: 1, title: "Setup" }],
		outputDir: "/tmp/output/prompts",
		readme: "# README",
	}),
}))

vi.mock("@app/pipeline/workspace.js", () => ({
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

vi.mock("@app/pipeline/planner.js", () => ({
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

vi.mock("@app/pipeline/wave-executor.js", () => ({
	executeWaves: vi.fn().mockResolvedValue({
		results: createMockAnalysisResultMap(),
		failedAnalyzers: [],
	}),
}))

vi.mock("@app/pipeline/essence-synthesizer.js", () => ({
	synthesizeEssence: vi.fn().mockResolvedValue(createMockEssence()),
}))

vi.mock("@domain/analysis/reconciliation.js", () => ({
	reconcileAnalysis: vi.fn().mockReturnValue({
		conflicts: [],
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
		const { findMonorepoRoot } = await import("@infra/source/workspace-detector.js")
		vi.mocked(findMonorepoRoot).mockResolvedValue(null)

		const { synthesizeEssence } = await import("@app/pipeline/essence-synthesizer.js")
		vi.mocked(synthesizeEssence).mockResolvedValue(createMockEssence())

		const { resolveRepo } = await import("@infra/source/repo-resolver.js")
		vi.mocked(resolveRepo).mockResolvedValue({
			localPath: "/tmp/test-repo",
			source: ".",
			projectName: "test-repo",
			isTemporary: false,
			cleanup: vi.fn(),
		})

		const { runExtraction } = await import("@infra/source/index.js")
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

		const { createWorkspace } = await import("@app/pipeline/workspace.js")
		vi.mocked(createWorkspace).mockResolvedValue({
			tmpDir: "/tmp/output/.tmp",
			writeMarkdown: vi.fn().mockResolvedValue(undefined),
			writeJSON: vi.fn().mockResolvedValue(undefined),
			readMarkdown: vi.fn().mockResolvedValue(""),
			readJSON: vi.fn().mockResolvedValue({}),
			exists: vi.fn().mockResolvedValue(false),
			cleanup: vi.fn().mockResolvedValue(undefined),
		})

		const { planAnalysis } = await import("@app/pipeline/planner.js")
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

		const { executeWaves } = await import("@app/pipeline/wave-executor.js")
		vi.mocked(executeWaves).mockResolvedValue({
			results: createMockAnalysisResultMap(),
			failedAnalyzers: [],
		})
	})

	describe("runAnalysisPipeline", () => {
		it("succeeds with all analyzers passing", async () => {
			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
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
			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const { resolveRepo } = await import("@infra/source/repo-resolver.js")
			const { runExtraction } = await import("@infra/source/index.js")

			const client = createMockLLMClient()
			await runAnalysisPipeline(".", createMockConfig(), { llmClient: client })

			expect(resolveRepo).toHaveBeenCalledWith(".")
			expect(runExtraction).toHaveBeenCalledWith("/tmp/test-repo", undefined, undefined)
		})

		it("creates workspace and calls planAnalysis", async () => {
			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const { createWorkspace } = await import("@app/pipeline/workspace.js")
			const { planAnalysis } = await import("@app/pipeline/planner.js")

			const client = createMockLLMClient()
			await runAnalysisPipeline(".", createMockConfig(), { llmClient: client })

			expect(createWorkspace).toHaveBeenCalled()
			expect(planAnalysis).toHaveBeenCalled()
		})

		it("calls executeWaves with plan", async () => {
			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const { executeWaves } = await import("@app/pipeline/wave-executor.js")

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
			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const { writeFileContent } = await import("@infra/fs.js")

			const client = createMockLLMClient()
			await runAnalysisPipeline(".", createMockConfig(), { llmClient: client })

			expect(writeFileContent).toHaveBeenCalledWith(
				expect.stringContaining("analysis.json"),
				expect.any(String),
			)
		})

		it("returns usage summary", async () => {
			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.usage).toBeDefined()
			expect(result.usage?.totalCalls).toBeGreaterThanOrEqual(0)
		})

		it("fails when extraction finds no files", async () => {
			const { runExtraction } = await import("@infra/source/index.js")
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

			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(false)
		})

		it("fails when extraction fails", async () => {
			const { runExtraction } = await import("@infra/source/index.js")
			vi.mocked(runExtraction).mockRejectedValueOnce(new Error("Extraction error"))

			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)
		})

		it("succeeds with some non-critical analyzers failing", async () => {
			const { executeWaves } = await import("@app/pipeline/wave-executor.js")
			const results = createMockAnalysisResultMap()
			results.pageStructures = null
			results.interactionPatterns = null
			vi.mocked(executeWaves).mockResolvedValueOnce({
				results,
				failedAnalyzers: ["pageStructures", "interactionPatterns"],
			})

			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			// Non-critical failures (enrichment tier) should still succeed
			expect(result.success).toBe(true)
		})

		it("fails when designTokens analyzer fails (critical)", async () => {
			const { executeWaves } = await import("@app/pipeline/wave-executor.js")
			const results = createMockAnalysisResultMap()
			results.designTokens = null
			vi.mocked(executeWaves).mockResolvedValueOnce({
				results,
				failedAnalyzers: ["designTokens"],
			})

			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(false)
		})

		it("fails when essence synthesis fails", async () => {
			const { synthesizeEssence } = await import("@app/pipeline/essence-synthesizer.js")
			vi.mocked(synthesizeEssence).mockRejectedValueOnce(new Error("Essence synthesis failed"))

			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(false)
		})

		it("calls cleanup even on failure", async () => {
			const { resolveRepo } = await import("@infra/source/repo-resolver.js")
			const cleanupFn = vi.fn()
			vi.mocked(resolveRepo).mockResolvedValueOnce({
				localPath: "/tmp/test-repo",
				source: ".",
				projectName: "test-repo",
				isTemporary: false,
				cleanup: cleanupFn,
			})

			const { runExtraction } = await import("@infra/source/index.js")
			vi.mocked(runExtraction).mockRejectedValueOnce(new Error("Extraction error"))

			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const client = createMockLLMClient()
			await runAnalysisPipeline(".", createMockConfig(), { llmClient: client })

			expect(cleanupFn).toHaveBeenCalled()
		})

		it("cleans up workspace even on failure", async () => {
			const { createWorkspace } = await import("@app/pipeline/workspace.js")
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

			const { runExtraction } = await import("@infra/source/index.js")
			vi.mocked(runExtraction).mockRejectedValueOnce(new Error("Extraction error"))

			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const client = createMockLLMClient()
			await runAnalysisPipeline(".", createMockConfig(), { llmClient: client })

			expect(workspaceCleanup).toHaveBeenCalled()
		})

		it("detects monorepo and passes monorepoInfo to runExtraction", async () => {
			const { findMonorepoRoot } = await import("@infra/source/workspace-detector.js")
			vi.mocked(findMonorepoRoot).mockResolvedValueOnce("/tmp/monorepo-root")

			const { runExtraction } = await import("@infra/source/index.js")

			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const client = createMockLLMClient()
			const result = await runAnalysisPipeline(".", createMockConfig(), {
				llmClient: client,
			})

			expect(result.success).toBe(true)
			expect(findMonorepoRoot).toHaveBeenCalled()
			expect(runExtraction).toHaveBeenCalledWith(
				"/tmp/test-repo",
				{
					rootPath: "/tmp/monorepo-root",
					targetRelative: expect.any(String),
					depPaths: [],
				},
				undefined,
			)
		})

		it("fails when planning fails", async () => {
			const { planAnalysis } = await import("@app/pipeline/planner.js")
			vi.mocked(planAnalysis).mockRejectedValueOnce(new Error("Planning failed"))

			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
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
			const { runGeneratePipeline } = await import("@app/pipeline/orchestrator.js")
			const { writeDocuments } = await import("@infra/output/docs.js")
			const { writePrompts } = await import("@infra/output/prompts.js")

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
			const { runGeneratePipeline } = await import("@app/pipeline/orchestrator.js")
			const { writePrompts } = await import("@infra/output/prompts.js")

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
			const { runGeneratePipeline } = await import("@app/pipeline/orchestrator.js")
			const { writeDocuments } = await import("@infra/output/docs.js")

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
			const { runGeneratePipeline } = await import("@app/pipeline/orchestrator.js")
			const { readFileContent } = await import("@infra/fs.js")

			await runGeneratePipeline({
				analysisPath: "/tmp/my-analysis.json",
				output: "/tmp/output",
				language: "en",
			})

			expect(readFileContent).toHaveBeenCalledWith("/tmp/my-analysis.json")
		})

		it("returns duration", async () => {
			const { runGeneratePipeline } = await import("@app/pipeline/orchestrator.js")

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
			const { runPipeline } = await import("@app/pipeline/orchestrator.js")
			const { writeDocuments } = await import("@infra/output/docs.js")
			const { writePrompts } = await import("@infra/output/prompts.js")
			const { writeFileContent } = await import("@infra/fs.js")

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
			const { runExtraction } = await import("@infra/source/index.js")
			vi.mocked(runExtraction).mockRejectedValueOnce(new Error("Extraction error"))

			const { runPipeline } = await import("@app/pipeline/orchestrator.js")
			const { writeDocuments } = await import("@infra/output/docs.js")

			const result = await runPipeline(".", createMockConfig())

			expect(result.success).toBe(false)
			expect(writeDocuments).not.toHaveBeenCalled()
		})

		it("passes docsOnly/promptsOnly from config", async () => {
			const { runPipeline } = await import("@app/pipeline/orchestrator.js")
			const { writePrompts } = await import("@infra/output/prompts.js")

			const config = createMockConfig()
			config.docsOnly = true

			const result = await runPipeline(".", config)

			expect(result.success).toBe(true)
			expect(writePrompts).not.toHaveBeenCalled()
		})
	})

	describe("validateAnalysisConfig", () => {
		it("throws UserError when API key is missing for openai", async () => {
			const { validateAnalysisConfig } = await import("@app/pipeline/orchestrator.js")

			const config = createMockConfig()
			config.apiKeys = {}

			expect(() => validateAnalysisConfig(config)).toThrow(UserError)
			expect(() => validateAnalysisConfig(config)).toThrow(/OpenAI API key is required/)
		})

		it("throws UserError when API key is missing for anthropic", async () => {
			const { validateAnalysisConfig } = await import("@app/pipeline/orchestrator.js")

			const config = createMockConfig()
			config.provider = "anthropic"
			config.apiKeys = {}

			expect(() => validateAnalysisConfig(config)).toThrow(UserError)
			expect(() => validateAnalysisConfig(config)).toThrow(/Anthropic API key is required/)
		})

		it("throws UserError when API key is missing for zai", async () => {
			const { validateAnalysisConfig } = await import("@app/pipeline/orchestrator.js")

			const config = createMockConfig()
			config.provider = "zai"
			config.apiKeys = {}

			expect(() => validateAnalysisConfig(config)).toThrow(UserError)
			expect(() => validateAnalysisConfig(config)).toThrow(/Z\.AI API key is required/)
		})

		it("passes when API key exists", async () => {
			const { validateAnalysisConfig } = await import("@app/pipeline/orchestrator.js")

			expect(() => validateAnalysisConfig(createMockConfig())).not.toThrow()
		})
	})

	describe("validateGenerateInput", () => {
		it("throws UserError when analysis file does not exist", async () => {
			const { access } = await import("node:fs/promises")
			vi.mocked(access).mockRejectedValueOnce(new Error("ENOENT"))

			const { validateGenerateInput } = await import("@app/pipeline/orchestrator.js")

			await expect(
				validateGenerateInput({
					analysisPath: "/tmp/missing.json",
					output: "/tmp/output",
					language: "en",
				}),
			).rejects.toThrow(/Analysis file not found/)
		})

		it("throws UserError when file contains invalid JSON", async () => {
			const { readFileContent } = await import("@infra/fs.js")
			vi.mocked(readFileContent).mockResolvedValueOnce("not valid json{{{")

			const { validateGenerateInput } = await import("@app/pipeline/orchestrator.js")

			await expect(
				validateGenerateInput({
					analysisPath: "/tmp/bad.json",
					output: "/tmp/output",
					language: "en",
				}),
			).rejects.toThrow(/Invalid JSON/)
		})

		it("throws UserError when techStack is missing", async () => {
			const { readFileContent } = await import("@infra/fs.js")
			vi.mocked(readFileContent).mockResolvedValueOnce(JSON.stringify({ essence: {} }))

			const { validateGenerateInput } = await import("@app/pipeline/orchestrator.js")

			await expect(
				validateGenerateInput({
					analysisPath: "/tmp/analysis.json",
					output: "/tmp/output",
					language: "en",
				}),
			).rejects.toThrow(/missing required field: techStack/)
		})

		it("throws UserError when essence is missing", async () => {
			const { readFileContent } = await import("@infra/fs.js")
			vi.mocked(readFileContent).mockResolvedValueOnce(JSON.stringify({ techStack: {} }))

			const { validateGenerateInput } = await import("@app/pipeline/orchestrator.js")

			await expect(
				validateGenerateInput({
					analysisPath: "/tmp/analysis.json",
					output: "/tmp/output",
					language: "en",
				}),
			).rejects.toThrow(/missing required field: essence/)
		})

		it("throws UserError for unknown target preset", async () => {
			const { validateGenerateInput } = await import("@app/pipeline/orchestrator.js")

			await expect(
				validateGenerateInput({
					analysisPath: "/tmp/analysis.json",
					output: "/tmp/output",
					language: "en",
					target: "nonexistent-preset",
				}),
			).rejects.toThrow(/Unknown target preset: "nonexistent-preset"/)
		})

		it("passes with valid input and known target", async () => {
			const { validateGenerateInput } = await import("@app/pipeline/orchestrator.js")

			const result = await validateGenerateInput({
				analysisPath: "/tmp/analysis.json",
				output: "/tmp/output",
				language: "en",
				target: "next-tailwind",
			})

			expect(result).toBeDefined()
			expect(result.techStack).toBeDefined()
		})
	})

	describe("runAnalysisPipeline - early validation", () => {
		it("throws UserError before extraction when API key is missing", async () => {
			const { runAnalysisPipeline } = await import("@app/pipeline/orchestrator.js")
			const { runExtraction } = await import("@infra/source/index.js")

			const config = createMockConfig()
			config.apiKeys = {}

			await expect(
				runAnalysisPipeline(".", config, { llmClient: createMockLLMClient() }),
			).rejects.toThrow(UserError)

			// Extraction should NOT have been called
			expect(runExtraction).not.toHaveBeenCalled()
		})
	})
})
