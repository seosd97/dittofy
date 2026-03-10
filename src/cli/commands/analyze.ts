import { defineCommand } from "citty"
import { loadDittoConfig } from "../../config/index.js"
import { runPipeline } from "../../pipeline/orchestrator.js"
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
			description: "LLM provider: openai, anthropic, or zhipu (default: openai)",
		},
		language: {
			type: "string",
			alias: "l",
			description: "Output language: ko or en (default: ko)",
		},
		"docs-only": {
			type: "boolean",
			description: "Generate only design spec documents (skip prompts)",
		},
		"prompts-only": {
			type: "boolean",
			description: "Generate only implementation prompts (skip docs)",
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

		logger.info(`Ditto v0.1.0 — Analyzing: ${source}`)

		const result = await runPipeline(source, config)
		formatResult(result)

		if (!result.success) {
			process.exitCode = 1
		}
	},
})
