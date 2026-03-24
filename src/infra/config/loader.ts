import { readFile } from "node:fs/promises"
import type { DittoConfig } from "@defs/config.js"
import { UserError } from "@defs/errors.js"
import { ensureDittoHome, getSettingsPath } from "@infra/fs.js"
import { loadConfig } from "c12"
import { defaultConfig } from "./defaults.js"
import { PROVIDER_ENV_VARS } from "./provider-env.js"
import { configSchema } from "./schema.js"

export async function loadDittoConfig(
	overrides: Record<string, unknown> = {},
): Promise<DittoConfig> {
	// 1. Load ~/.ditto/settings.json as base config
	const settingsConfig = await loadSettingsJson()

	// 2. Load CWD .env for API keys (c12 dotenv)
	const { config: envConfig } = await loadConfig({
		name: "ditto",
		dotenv: true,
		defaults: {},
		overrides: {},
	})

	// 3. Merge: defaults → settings.json → .env → CLI overrides
	const merged = {
		...defaultConfig,
		...stripUndefined(settingsConfig),
		...stripUndefined(envConfig as Record<string, unknown>),
		...stripUndefined(overrides),
	}

	const resolved = resolveApiKeys(merged as Record<string, unknown>)

	try {
		return configSchema.parse(resolved)
	} catch (error) {
		if (error instanceof Error && "issues" in error) {
			const issues = (error as { issues: { path: string[]; message: string }[] }).issues
			const details = issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")
			throw new UserError(
				`Invalid configuration:\n${details}\n\nHint: Set API keys in a .env file (e.g. OPENAI_API_KEY=sk-...) or export them in your shell.\nConfig file: ${getSettingsPath()}`,
			)
		}
		throw new UserError(
			`Invalid configuration: ${error instanceof Error ? error.message : String(error)}`,
		)
	}
}

async function loadSettingsJson(): Promise<Record<string, unknown>> {
	try {
		const settingsPath = getSettingsPath()
		const content = await readFile(settingsPath, "utf-8")
		return JSON.parse(content) as Record<string, unknown>
	} catch {
		// settings.json doesn't exist yet — that's fine
		return {}
	}
}

function resolveApiKeys(config: Record<string, unknown>): Record<string, unknown> {
	const apiKeys = (config.apiKeys ?? {}) as Record<string, string | undefined>
	const resolved: Record<string, string | undefined> = {}
	for (const [provider, envVar] of Object.entries(PROVIDER_ENV_VARS)) {
		resolved[provider] = apiKeys[provider] ?? process.env[envVar]
	}
	return {
		...config,
		apiKeys: resolved,
	}
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined) result[key] = value
	}
	return result
}
