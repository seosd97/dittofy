import { readFile, writeFile } from "node:fs/promises"
import { loadDittoConfig } from "@infra/config/loader.js"
import { ensureDittoHome, getSettingsPath } from "@infra/fs.js"
import { logger } from "@infra/logger.js"
import { defineCommand } from "citty"

const ALLOWED_KEYS = ["output", "language", "model", "provider"] as const

async function readSettings(): Promise<Record<string, unknown>> {
	try {
		const content = await readFile(getSettingsPath(), "utf-8")
		return JSON.parse(content) as Record<string, unknown>
	} catch {
		return {}
	}
}

async function writeSettings(settings: Record<string, unknown>): Promise<void> {
	await ensureDittoHome()
	await writeFile(getSettingsPath(), JSON.stringify(settings, null, "\t"), "utf-8")
}

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
				logger.log(`Config file: ${getSettingsPath()}\n`)
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
			meta: { name: "set", description: "Set a configuration value" },
			args: {
				key: {
					type: "positional",
					description: `Configuration key (${ALLOWED_KEYS.join(", ")})`,
					required: true,
				},
				value: { type: "positional", description: "Configuration value", required: true },
			},
			async run({ args }) {
				if (!ALLOWED_KEYS.includes(args.key as (typeof ALLOWED_KEYS)[number])) {
					logger.error(
						`Unknown config key: "${args.key}". Allowed keys: ${ALLOWED_KEYS.join(", ")}`,
					)
					logger.info("For API keys, use environment variables or .env file:")
					logger.info("  OPENAI_API_KEY, ANTHROPIC_API_KEY, ZAI_API_KEY")
					process.exitCode = 1
					return
				}

				const settings = await readSettings()
				settings[args.key] = args.value
				await writeSettings(settings)
				logger.info(`Set ${args.key} = "${args.value}" in ${getSettingsPath()}`)
			},
		}),
		path: defineCommand({
			meta: { name: "path", description: "Show Ditto config directory path" },
			run() {
				logger.log(getSettingsPath())
			},
		}),
	},
})
