import type { DittoConfig } from "./config.js"

export type ConfidenceLevel = "high" | "medium" | "low"

export interface Confident<T> {
	value: T
	confidence: ConfidenceLevel
}

export interface PipelineContext {
	config: DittoConfig
	source: string
	resolvedPath: string
	projectName: string
	outputDir: string
	startTime: number
	llmClient: import("@llm/client.js").ILLMClient
	usage: import("@llm/usage.js").UsageTracker
}

export type PhaseStatus = "pending" | "running" | "completed" | "failed" | "partial"

export type PhaseResult<T> =
	| { status: "completed" | "partial"; data: T; errors: PhaseError[]; duration: number }
	| { status: "failed"; data?: undefined; errors: PhaseError[]; duration: number }

export interface PhaseError {
	phase: string
	message: string
	cause?: unknown
}

export interface HealthCheckResult {
	status: "pass" | "warn" | "fail"
	checks: HealthCheck[]
}

export interface HealthCheck {
	name: string
	status: "pass" | "warn" | "fail"
	message: string
}
