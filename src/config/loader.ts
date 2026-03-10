import { loadConfig } from "c12"
import type { DittoConfig } from "../types/config.js"
import { UserError } from "../types/errors.js"
import { defaultConfig } from "./defaults.js"
import { configSchema } from "./schema.js"

export async function loadDittoConfig(
	overrides: Record<string, unknown> = {},
): Promise<DittoConfig> {
	const { config } = await loadConfig({
		name: "ditto",
		dotenv: true,
		defaults: defaultConfig as unknown as Record<string, unknown>,
		overrides,
	})

	const resolved = resolveApiKeys(config as Record<string, unknown>)

	try {
		return configSchema.parse(resolved)
	} catch (error) {
		if (error instanceof Error && "issues" in error) {
			const issues = (error as { issues: { path: string[]; message: string }[] }).issues
			const details = issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")
			throw new UserError(`Invalid configuration:\n${details}`)
		}
		throw new UserError(`Invalid configuration: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function resolveApiKeys(config: Record<string, unknown>): Record<string, unknown> {
	const apiKeys = (config.apiKeys ?? {}) as Record<string, string | undefined>
	return {
		...config,
		apiKeys: {
			openai: apiKeys.openai ?? process.env.OPENAI_API_KEY,
			anthropic: apiKeys.anthropic ?? process.env.ANTHROPIC_API_KEY,
			zhipu: apiKeys.zhipu ?? process.env.ZHIPU_API_KEY,
		},
	}
}
