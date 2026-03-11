import type { LLMProvider } from "@defs/config.js"

// ── Task Presets ────────────────────────────────────────────

export interface TaskPreset {
	temperature: number
	maxOutputTokens: number
	baseTimeoutMs: number
}

export const TASK_PRESETS = {
	// Phase 2: Analysis
	tokenAnalyzer: { temperature: 0.1, maxOutputTokens: 4096, baseTimeoutMs: 120_000 },
	typographyAnalyzer: { temperature: 0.1, maxOutputTokens: 4096, baseTimeoutMs: 120_000 },
	componentAnalyzer: { temperature: 0.2, maxOutputTokens: 8192, baseTimeoutMs: 180_000 },
	layoutAnalyzer: { temperature: 0.2, maxOutputTokens: 4096, baseTimeoutMs: 120_000 },
	pageAnalyzer: { temperature: 0.2, maxOutputTokens: 4096, baseTimeoutMs: 120_000 },
	responsiveAnalyzer: { temperature: 0.1, maxOutputTokens: 4096, baseTimeoutMs: 120_000 },
	interactionAnalyzer: { temperature: 0.2, maxOutputTokens: 4096, baseTimeoutMs: 120_000 },
	essenceSynthesizer: { temperature: 0.3, maxOutputTokens: 8192, baseTimeoutMs: 180_000 },
	// Phase 3: Documentation
	docGenerator: { temperature: 0.3, maxOutputTokens: 16384, baseTimeoutMs: 300_000 },
	// Phase 4: Prompt Generation
	promptGenerator: { temperature: 0.2, maxOutputTokens: 16384, baseTimeoutMs: 300_000 },
} as const satisfies Record<string, TaskPreset>

export type PresetName = keyof typeof TASK_PRESETS

// ── Provider Profiles ───────────────────────────────────────

export interface ProviderProfile {
	tokenMultiplier: number
	timeoutMultiplier: number
	maxRetries: number
}

export const PROVIDER_PROFILES: Record<LLMProvider, ProviderProfile> = {
	openai: { tokenMultiplier: 1.0, timeoutMultiplier: 1.0, maxRetries: 3 },
	anthropic: { tokenMultiplier: 1.0, timeoutMultiplier: 1.0, maxRetries: 3 },
	zai: { tokenMultiplier: 1.5, timeoutMultiplier: 2.0, maxRetries: 2 },
}

// ── Resolver ────────────────────────────────────────────────

export interface ResolvedCallConfig {
	temperature: number
	maxOutputTokens: number
	timeoutMs: number
	maxRetries: number
}

export function resolveCallConfig(preset: PresetName, provider: LLMProvider): ResolvedCallConfig {
	const task = TASK_PRESETS[preset]
	const profile = PROVIDER_PROFILES[provider]

	return {
		temperature: task.temperature,
		maxOutputTokens: Math.round(task.maxOutputTokens * profile.tokenMultiplier),
		timeoutMs: Math.round(task.baseTimeoutMs * profile.timeoutMultiplier),
		maxRetries: profile.maxRetries,
	}
}
