import { readFile, writeFile } from "node:fs/promises"
import { createInterface } from "node:readline"
import { ensureDittoHome, getSettingsPath } from "@infra/fs.js"
import { logger } from "@infra/logger.js"
import { defineCommand } from "citty"

const PROVIDERS = [
	{ id: "openai", name: "OpenAI", envVar: "OPENAI_API_KEY" },
	{ id: "anthropic", name: "Anthropic (Claude)", envVar: "ANTHROPIC_API_KEY" },
	{ id: "zai", name: "Z.AI (GLM)", envVar: "ZAI_API_KEY" },
	{ id: "gemini", name: "Google Gemini", envVar: "GOOGLE_GENERATIVE_AI_API_KEY" },
	{ id: "openrouter", name: "OpenRouter", envVar: "OPENROUTER_API_KEY" },
	{ id: "groq", name: "Groq", envVar: "GROQ_API_KEY" },
	{ id: "mistral", name: "Mistral", envVar: "MISTRAL_API_KEY" },
	{ id: "deepseek", name: "DeepSeek", envVar: "DEEPSEEK_API_KEY" },
	{ id: "xai", name: "xAI (Grok)", envVar: "XAI_API_KEY" },
] as const

function ask(question: string): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout })
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close()
			resolve(answer.trim())
		})
	})
}

function maskKey(key: string): string {
	if (key.length <= 8) return "****"
	return `${key.slice(0, 4)}${"*".repeat(key.length - 8)}${key.slice(-4)}`
}

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

export const initCommand = defineCommand({
	meta: {
		name: "init",
		description: "Interactive setup — configure provider and API key",
	},
	async run() {
		logger.log("")
		logger.log("Welcome to Dittofy!")
		logger.log("Let's set up your configuration.\n")

		const settings = await readSettings()

		logger.log("Available LLM providers:\n")
		for (let i = 0; i < PROVIDERS.length; i++) {
			const p = PROVIDERS[i]
			logger.log(`  ${i + 1}. ${p.name}`)
		}
		logger.log("")

		const providerAnswer = await ask("Select a provider (1-9): ")
		const providerIndex = Number.parseInt(providerAnswer, 10) - 1
		if (Number.isNaN(providerIndex) || providerIndex < 0 || providerIndex >= PROVIDERS.length) {
			logger.error("Invalid selection.")
			process.exitCode = 1
			return
		}

		const selected = PROVIDERS[providerIndex]
		logger.log(`\nSelected: ${selected.name}`)
		logger.log(`(You can also set the API key via the ${selected.envVar} environment variable)\n`)

		const apiKey = await ask(`Enter your ${selected.name} API key: `)
		if (!apiKey) {
			logger.error("API key is required.")
			process.exitCode = 1
			return
		}

		settings.provider = selected.id
		if (!settings.apiKeys) {
			settings.apiKeys = {}
		}
		;(settings.apiKeys as Record<string, string>)[selected.id] = apiKey

		await writeSettings(settings)

		logger.log("")
		logger.success("Configuration saved!")
		logger.log(`  Config:  ${getSettingsPath()}`)
		logger.log(`  Provider: ${selected.name}`)
		logger.log(`  API Key:  ${maskKey(apiKey)}`)
		logger.log("")
		logger.log("You're ready to go. Run:")
		logger.log("  dittofy analyze <path-or-github-url>")
		logger.log("")
	},
})
