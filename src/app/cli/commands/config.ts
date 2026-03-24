import { loadDittoConfig } from "@infra/config/loader.js"
import { logger } from "@infra/logger.js"
import { defineCommand } from "citty"

export const configCommand = defineCommand({
	meta: {
		name: "config",
		description: "Manage Ditto configuration",
	},
	subCommands: {
		show: defineCommand({
			meta: { name: "show", description: "Show current configuration" },
			async run() {
				const config = await loadDittoConfig()
				const display = {
					output: config.output,
					language: config.language,
					model: config.model,
					provider: config.provider,
					apiKeys: {
						openai: config.apiKeys.openai ? "***configured***" : "(not set)",
						anthropic: config.apiKeys.anthropic ? "***configured***" : "(not set)",
						zai: config.apiKeys.zai ? "***configured***" : "(not set)",
					},
					docsOnly: config.docsOnly,
					promptsOnly: config.promptsOnly,
				}
				logger.log("Current configuration:\n")
				for (const [key, value] of Object.entries(display)) {
					if (typeof value === "object") {
						logger.log(`  ${key}:`)
						for (const [k, v] of Object.entries(value)) {
							logger.log(`    ${k}: ${v}`)
						}
					} else {
						logger.log(`  ${key}: ${value}`)
					}
				}
				logger.log("")
			},
		}),
		set: defineCommand({
			meta: { name: "set", description: "Show how to configure a setting" },
			args: {
				key: {
					type: "positional",
					description: "Configuration key (e.g., provider, model, language)",
					required: true,
				},
				value: { type: "positional", description: "Configuration value", required: true },
			},
			async run({ args }) {
				const allowedKeys = ["output", "language", "model", "provider"]
				if (!allowedKeys.includes(args.key)) {
					logger.error(`Unknown config key: "${args.key}". Allowed keys: ${allowedKeys.join(", ")}`)
					logger.info("For API keys, use environment variables or .env file:")
					logger.info("  OPENAI_API_KEY, ANTHROPIC_API_KEY, ZAI_API_KEY")
					process.exitCode = 1
					return
				}

				// c12 stores config in ditto.config.ts/json etc. For now, guide the user.
				logger.info(`To set "${args.key}" to "${args.value}", create or edit ditto.config.ts:`)
				logger.log("")
				logger.log("  // ditto.config.ts")
				logger.log(`  export default { ${args.key}: "${args.value}" }`)
				logger.log("")
				logger.info("Or pass it as a CLI flag:")
				logger.log(`  ditto analyze <source> --${args.key} ${args.value}`)
				logger.log("")
			},
		}),
	},
})
