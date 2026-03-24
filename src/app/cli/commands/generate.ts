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
		"dry-run": {
			type: "boolean",
			description: "Preview output without writing files — show what WOULD be generated",
			default: false,
		},
	},
	async run({ args }) {
		const analysisPath = resolve(args.from)
		const output = resolve(args.output)
		const language = (args.language === "ko" ? "ko" : "en") as "ko" | "en"

		consola.info(`Generating from: ${analysisPath}`)
		consola.info(`Output: ${output}`)
		if (args.target !== "auto") {
			consola.info(`Target: ${args.target}`)
		}

		const generateConfig = {
			analysisPath,
			output,
			language,
			target: args.target !== "auto" ? args.target : undefined,
			docsOnly: args["docs-only"],
			promptsOnly: args["prompts-only"],
		}

		if (args["dry-run"]) {
			const { validateGenerateInput } = await import("@app/pipeline/orchestrator.js")
			const { assembleDocuments } = await import("@app/pipeline/doc-assembler.js")
			const { assemblePrompts } = await import("@app/pipeline/prompt-assembler.js")
			const { resolveEnvironment } = await import("@domain/rendering/resolve-environment.js")

			const analysisResult = await validateGenerateInput(generateConfig)
			const env = resolveEnvironment(analysisResult.techStack, generateConfig.target)

			consola.info("")
			consola.info("=== Dry Run Summary ===")
			consola.info("")

			if (!generateConfig.promptsOnly) {
				const docOutputDir = resolve(output, "design-spec")
				const documentSet = assembleDocuments(analysisResult, env, language, docOutputDir)

				consola.info(`Documents (${documentSet.documents.length} files → ${docOutputDir}):`)
				for (const doc of documentSet.documents) {
					const sizeKB = (Buffer.byteLength(doc.content, "utf-8") / 1024).toFixed(1)
					consola.info(`  ${doc.filename}  (${sizeKB} KB) — ${doc.title}`)
				}
				consola.info("")
			}

			if (!generateConfig.docsOnly) {
				const promptOutputDir = resolve(output, "prompts")
				const promptSet = assemblePrompts(analysisResult, env, language, promptOutputDir)

				consola.info(`Prompts (${promptSet.steps.length} files → ${promptOutputDir}):`)
				for (const step of promptSet.steps) {
					const sizeKB = (Buffer.byteLength(step.content, "utf-8") / 1024).toFixed(1)
					consola.info(
						`  ${step.filename}  (${sizeKB} KB) — Step ${step.stepNumber}: ${step.title}`,
					)
				}
				consola.info("")
			}

			consola.info("No files were written. Run without --dry-run to generate output.")
			return
		}

		const { runGeneratePipeline } = await import("@app/pipeline/orchestrator.js")

		const result = await runGeneratePipeline(generateConfig)

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
