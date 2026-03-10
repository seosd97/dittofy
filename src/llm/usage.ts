import type { LanguageModelUsage } from "ai"
import { logger } from "../utils/logger.js"

export interface UsageRecord {
	phase: string
	analyzer: string
	inputTokens: number
	outputTokens: number
	reasoningTokens: number
	totalTokens: number
}

export class UsageTracker {
	private records: UsageRecord[] = []

	record(phase: string, analyzer: string, usage: LanguageModelUsage) {
		const reasoningTokens = (usage as unknown as Record<string, unknown>).reasoningTokens
		this.records.push({
			phase,
			analyzer,
			inputTokens: usage.inputTokens ?? 0,
			outputTokens: usage.outputTokens ?? 0,
			reasoningTokens: typeof reasoningTokens === "number" ? reasoningTokens : 0,
			totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
		})
	}

	getSummary() {
		const totalInput = this.records.reduce((sum, r) => sum + r.inputTokens, 0)
		const totalOutput = this.records.reduce((sum, r) => sum + r.outputTokens, 0)
		const totalReasoning = this.records.reduce((sum, r) => sum + r.reasoningTokens, 0)
		return {
			totalCalls: this.records.length,
			totalInputTokens: totalInput,
			totalOutputTokens: totalOutput,
			totalReasoningTokens: totalReasoning,
			totalTokens: totalInput + totalOutput,
			records: [...this.records],
		}
	}

	printSummary() {
		const summary = this.getSummary()
		const parts = [
			`${summary.totalCalls} calls`,
			`${summary.totalTokens.toLocaleString()} total tokens`,
		]
		if (summary.totalReasoningTokens > 0) {
			parts.push(`${summary.totalReasoningTokens.toLocaleString()} reasoning`)
		}
		logger.info(`LLM Usage: ${parts.join(", ")}`)
		logger.debug(
			`  Input: ${summary.totalInputTokens.toLocaleString()}, Output: ${summary.totalOutputTokens.toLocaleString()}`,
		)
	}
}
