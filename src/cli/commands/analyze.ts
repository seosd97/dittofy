import { defineCommand } from "citty"
import { loadDittoConfig } from "../../config/index.js"
import { runAnalysisPipeline, runPipeline } from "../../pipeline/orchestrator.js"
import { UserError } from "../../types/errors.js"
import { logger, setDebugMode } from "../../utils/logger.js"
import { formatResult } from "../formatter.js"

export const analyzeCommand = defineCommand({
	meta: {
		name: "analyze",
		description: "Analyze a frontend repository",
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
			description: "LLM model to use (default: gpt-5.2)",
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

		const config = await loadDittoConfig({
			output: args.output,
			model: args.model,
			provider: args.provider,
			language: args.language,
			docsOnly: args["docs-only"],
			promptsOnly: args["prompts-only"],
		})

		if (args.include) {
			logger.info(`Include paths: ${args.include}`)
			// TODO: Wire up --include paths to extraction
		}

		logger.info(`Ditto v0.1.0 — Analyzing: ${source}`)

		if (args["analyze-only"]) {
			const result = await runAnalysisPipeline(source, config)

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

		const result = await runPipeline(source, config)
		formatResult(result)

		if (!result.success) {
			process.exitCode = 1
		}
	},
})
