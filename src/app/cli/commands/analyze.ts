import { runAnalysisPipeline, runPipeline } from "@app/pipeline/orchestrator.js"
import { UserError } from "@defs/errors.js"
import type { FileTreeNode } from "@defs/extraction.js"
import { countFiles } from "@domain/rendering/tree-renderer.js"
import { loadDittoConfig } from "@infra/config/loader.js"
import { logger, setDebugMode } from "@infra/logger.js"
import { runExtraction } from "@infra/source/index.js"
import { resolveRepo } from "@infra/source/repo-resolver.js"
import {
	detectApps,
	findMonorepoRoot,
	resolveWorkspaceDeps,
} from "@infra/source/workspace-detector.js"
import { defineCommand } from "citty"
import { formatResult } from "../formatter.js"

export const analyzeCommand = defineCommand({
	meta: {
		name: "analyze",
		description:
			"Analyze a frontend repository. API keys can be set via .env file or environment variables.",
	},
	args: {
		source: {
			type: "positional",
			description: "Local path or GitHub URL of the repository to analyze",
			required: true,
		},
		output: {
			type: "string",
			alias: "o",
			description: "Output directory (default: ditto-output)",
		},
		model: {
			type: "string",
			alias: "m",
			description: "LLM model to use (default: gpt-5.4-mini)",
		},
		provider: {
			type: "string",
			alias: "p",
			description: "LLM provider: openai, anthropic, or zai (default: openai)",
		},
		language: {
			type: "string",
			alias: "l",
			description: "Output language: ko or en (default: ko)",
		},
		"analyze-only": {
			type: "boolean",
			description: "Run analysis only — generate analysis.json without docs/prompts",
		},
		"docs-only": {
			type: "boolean",
			description: "Generate only design spec documents (skip prompts)",
		},
		"prompts-only": {
			type: "boolean",
			description: "Generate only implementation prompts (skip docs)",
		},
		include: {
			type: "string",
			description: "Additional directories to include in analysis (comma-separated, for monorepo)",
		},
		"dry-run": {
			type: "boolean",
			description:
				"Run extraction only — validate config and show project structure without LLM calls",
			default: false,
		},
		debug: {
			type: "boolean",
			alias: "d",
			description: "Enable debug logging",
		},
	},
	async run({ args }) {
		if (args.debug) {
			setDebugMode(true)
		}

		const source = args.source
		if (!source) {
			throw new UserError("Source path or GitHub URL is required")
		}

		const includePaths = args.include
			? args.include
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean)
			: undefined

		if (includePaths?.length) {
			logger.info(`Include paths: ${includePaths.join(", ")}`)
		}

		logger.info(`Ditto v0.1.0 — Analyzing: ${source}`)

		// Dry-run: extraction only, no config/API key needed
		if (args["dry-run"]) {
			await runAnalyzeDryRun(source, includePaths)
			return
		}

		const config = await loadDittoConfig({
			output: args.output,
			model: args.model,
			provider: args.provider,
			language: args.language,
			docsOnly: args["docs-only"],
			promptsOnly: args["prompts-only"],
		})

		if (args["analyze-only"]) {
			const result = await runAnalysisPipeline(
				source,
				config,
				includePaths ? { includePaths } : undefined,
			)

			if (result.success) {
				logger.info(`Analysis complete in ${(result.duration / 1000).toFixed(1)}s`)
				logger.info(`Output: ${result.outputDir}`)
				logger.info("  analysis.md  — design system summary")
				logger.info("  analysis.json — structured data (for ditto generate)")
				if (result.usage) {
					logger.info(
						`LLM usage: ${result.usage.totalCalls} calls, ${result.usage.totalTokens.toLocaleString()} tokens`,
					)
				}
			} else {
				logger.error("Analysis failed:")
				for (const error of result.errors) {
					logger.error(`  ${error.phase}: ${error.message}`)
				}
				process.exitCode = 1
			}
			return
		}

		const result = await runPipeline(source, config, includePaths ? { includePaths } : undefined)
		formatResult(result)

		if (!result.success) {
			process.exitCode = 1
		}
	},
})

async function runAnalyzeDryRun(source: string, includePaths?: string[]): Promise<void> {
	const resolved = await resolveRepo(source)

	try {
		// Detect monorepo
		const monorepoRoot = await findMonorepoRoot(resolved.localPath)
		const isMonorepo = !!monorepoRoot

		let monorepoInfo: { rootPath: string; targetRelative: string; depPaths?: string[] } | undefined
		if (isMonorepo && monorepoRoot) {
			const { relative } = await import("node:path")
			const targetRelative = relative(monorepoRoot, resolved.localPath)
			const depPaths = await resolveWorkspaceDeps(resolved.localPath, monorepoRoot)

			monorepoInfo = { rootPath: monorepoRoot, targetRelative, depPaths }
			logger.info(`Monorepo detected: root=${monorepoRoot}`)
			logger.info(`Target: ${targetRelative}`)
			if (depPaths.length > 0) {
				logger.info(`Workspace deps: ${depPaths.join(", ")}`)
			}
		}

		// Run extraction only (Phase 1) — no LLM calls
		const phase1Result = await runExtraction(resolved.localPath, monorepoInfo, includePaths)

		if (!phase1Result.data) {
			logger.error("Extraction failed:")
			for (const error of phase1Result.errors) {
				logger.error(`  ${error.phase}: ${error.message}`)
			}
			process.exitCode = 1
			return
		}

		const { extraction, techStack } = phase1Result.data

		const fileCount = extraction.fileTree.reduce(
			(sum: number, n: FileTreeNode) => sum + countFiles(n),
			0,
		)

		// Print dry-run summary
		logger.info("")
		logger.info("=== Dry Run Summary ===")
		logger.info("")
		logger.info(`Source: ${source}`)
		logger.info(`Files found: ${fileCount}`)
		logger.info("")
		logger.info("Tech Stack:")
		logger.info(`  Framework:  ${techStack.framework.value} (${techStack.framework.confidence})`)
		logger.info(`  Language:   ${techStack.language.value} (${techStack.language.confidence})`)
		logger.info(
			`  Styling:    ${techStack.styling.value.approach} (${techStack.styling.confidence})`,
		)
		if (techStack.uiLibrary) {
			logger.info(`  UI Library: ${techStack.uiLibrary.value} (${techStack.uiLibrary.confidence})`)
		}
		if (techStack.stateManagement) {
			logger.info(
				`  State Mgmt: ${techStack.stateManagement.value} (${techStack.stateManagement.confidence})`,
			)
		}
		if (techStack.buildTool) {
			logger.info(`  Build Tool: ${techStack.buildTool.value} (${techStack.buildTool.confidence})`)
		}
		logger.info("")
		logger.info("No LLM calls were made. Run without --dry-run to perform full analysis.")
	} finally {
		await resolved.cleanup()
	}
}
