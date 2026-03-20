import type { LLMProvider } from "@defs/config.js"
import { describe, expect, it } from "vitest"
import { PROVIDER_PROFILES, type PresetName, TASK_PRESETS, resolveCallConfig } from "../presets.js"

describe("resolveCallConfig", () => {
	it("returns base values for openai (multipliers = 1.0)", () => {
		const result = resolveCallConfig("tokenAnalyzer", "openai")
		expect(result.temperature).toBe(0.1)
		expect(result.maxOutputTokens).toBe(8192)
		expect(result.timeoutMs).toBe(120_000)
		expect(result.maxRetries).toBe(3)
	})

	it("applies zai multipliers", () => {
		const result = resolveCallConfig("tokenAnalyzer", "zai")
		expect(result.maxOutputTokens).toBe(Math.round(8192 * 1.5)) // 12288
		expect(result.timeoutMs).toBe(Math.round(120_000 * 2.0)) // 240000
		expect(result.maxRetries).toBe(2)
	})

	it("applies zai multipliers for heavy presets", () => {
		const result = resolveCallConfig("essenceSynthesizer", "zai")
		expect(result.maxOutputTokens).toBe(Math.round(8192 * 1.5)) // 12288
		expect(result.timeoutMs).toBe(Math.round(180_000 * 2.0)) // 360000
	})

	it("temperature is never multiplied", () => {
		const presetNames = Object.keys(TASK_PRESETS) as PresetName[]
		for (const preset of presetNames) {
			const base = TASK_PRESETS[preset]
			const result = resolveCallConfig(preset, "zai")
			expect(result.temperature).toBe(base.temperature)
		}
	})

	it("anthropic has same multipliers as openai", () => {
		const presetNames = Object.keys(TASK_PRESETS) as PresetName[]
		for (const preset of presetNames) {
			const openaiResult = resolveCallConfig(preset, "openai")
			const anthropicResult = resolveCallConfig(preset, "anthropic")
			expect(anthropicResult).toStrictEqual(openaiResult)
		}
	})

	it("all preset x provider combinations resolve without error", () => {
		const presetNames = Object.keys(TASK_PRESETS) as PresetName[]
		const providers = Object.keys(PROVIDER_PROFILES) as LLMProvider[]
		for (const preset of presetNames) {
			for (const provider of providers) {
				const result = resolveCallConfig(preset, provider)
				expect(result.temperature).toBeGreaterThan(0)
				expect(result.maxOutputTokens).toBeGreaterThan(0)
				expect(result.timeoutMs).toBeGreaterThan(0)
				expect(result.maxRetries).toBeGreaterThan(0)
			}
		}
	})
})

describe("TASK_PRESETS", () => {
	it("has valid values for every preset", () => {
		for (const [name, preset] of Object.entries(TASK_PRESETS)) {
			expect(preset.temperature, `${name}.temperature >= 0`).toBeGreaterThanOrEqual(0)
			expect(preset.temperature, `${name}.temperature <= 1`).toBeLessThanOrEqual(1)
			expect(preset.maxOutputTokens, `${name}.maxOutputTokens > 0`).toBeGreaterThan(0)
			expect(preset.baseTimeoutMs, `${name}.baseTimeoutMs > 0`).toBeGreaterThan(0)
		}
	})
})

describe("PROVIDER_PROFILES", () => {
	it("covers all providers", () => {
		const keys = Object.keys(PROVIDER_PROFILES).sort()
		expect(keys).toStrictEqual(["anthropic", "openai", "zai"])
	})
})
