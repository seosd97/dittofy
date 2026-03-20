import { resolve } from "node:path"
import { defineCommand } from "citty"
import { consola } from "consola"

export const generateCommand = defineCommand({
	meta: {
		name: "generate",
		description:
			"Generate design spec documents and implementation prompts from an existing analysis",
	},
	args: {
		from: {
			type: "string",
			description: "Path to analysis.json",
			required: true,
		},
		output: {
			type: "string",
			description: "Output directory",
			alias: "o",
			default: "./ditto-output",
		},
		language: {
			type: "string",
			description: "Output language (ko, en)",
			alias: "l",
			default: "en",
		},
		target: {
			type: "string",
			description:
				"Target environment preset (auto, next-tailwind, react-css-modules, vue-css, svelte-tailwind)",
			alias: "t",
			default: "auto",
		},
		"docs-only": {
			type: "boolean",
			description: "Generate only design spec documents (skip prompts)",
			default: false,
		},
		"prompts-only": {
			type: "boolean",
			description: "Generate only implementation prompts (skip docs)",
			default: false,
		},
	},
	async run({ args }) {
		const { runGeneratePipeline } = await import("@pipeline/orchestrator.js")

		const analysisPath = resolve(args.from)
		const output = resolve(args.output)
		const language = (args.language === "ko" ? "ko" : "en") as "ko" | "en"

		consola.info(`Generating from: ${analysisPath}`)
		consola.info(`Output: ${output}`)
		if (args.target !== "auto") {
			consola.info(`Target: ${args.target}`)
		}

		const result = await runGeneratePipeline({
			analysisPath,
			output,
			language,
			target: args.target !== "auto" ? args.target : undefined,
			docsOnly: args["docs-only"],
			promptsOnly: args["prompts-only"],
		})

		if (result.success) {
			consola.success(`Generation complete in ${(result.duration / 1000).toFixed(1)}s`)
			consola.info(`Output: ${result.outputDir}`)
		} else {
			consola.error("Generation failed:")
			for (const error of result.errors) {
				consola.error(`  ${error.phase}: ${error.message}`)
			}
			process.exit(1)
		}
	},
})
