import { mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const testHome = join(tmpdir(), `ditto-loader-test-${Date.now()}`)

vi.mock("c12", () => ({
	loadConfig: vi.fn().mockResolvedValue({ config: {} }),
}))

vi.mock("@infra/fs.js", () => ({
	DITTO_HOME: testHome,
	getSettingsPath: () => join(testHome, "settings.json"),
	getWorkspacesDir: () => join(testHome, "workspaces"),
	ensureDittoHome: async () => {
		const { mkdir } = await import("node:fs/promises")
		await mkdir(testHome, { recursive: true })
	},
}))

function restoreEnv(key: string, original: string | undefined): void {
	if (original === undefined) {
		delete process.env[key]
	} else {
		process.env[key] = original
	}
}

describe("loadDittoConfig", () => {
	beforeAll(async () => {
		await mkdir(testHome, { recursive: true })
	})

	afterAll(async () => {
		await rm(testHome, { recursive: true, force: true })
	})

	it("returns defaults when no settings.json exists", async () => {
		const { loadDittoConfig } = await import("../loader.js")
		// Provider must have API key — set in overrides to avoid validation error
		const config = await loadDittoConfig({ apiKeys: { openai: "sk-test" } })
		expect(config.model).toBe("gpt-5.4-mini")
		expect(config.provider).toBe("openai")
		expect(config.language).toBe("en")
	})

	it("settings.json overrides defaults", async () => {
		await writeFile(
			join(testHome, "settings.json"),
			JSON.stringify({ model: "glm-5", provider: "zai" }),
		)

		const { loadDittoConfig } = await import("../loader.js")
		const config = await loadDittoConfig({ apiKeys: { zai: "zai-test" } })
		expect(config.model).toBe("glm-5")
		expect(config.provider).toBe("zai")
		expect(config.language).toBe("en")

		// Cleanup
		await rm(join(testHome, "settings.json"), { force: true })
	})

	it("CLI overrides take precedence over settings.json", async () => {
		await writeFile(join(testHome, "settings.json"), JSON.stringify({ model: "glm-5" }))

		const { loadDittoConfig } = await import("../loader.js")
		const config = await loadDittoConfig({
			model: "gpt-5.4",
			apiKeys: { openai: "sk-test" },
		})
		expect(config.model).toBe("gpt-5.4")

		await rm(join(testHome, "settings.json"), { force: true })
	})

	it("resolves API keys from environment variables", async () => {
		const originalKey = process.env.OPENAI_API_KEY
		process.env.OPENAI_API_KEY = "sk-from-env"

		const { loadDittoConfig } = await import("../loader.js")
		const config = await loadDittoConfig()
		expect(config.apiKeys.openai).toBe("sk-from-env")

		restoreEnv("OPENAI_API_KEY", originalKey)
	})
})
