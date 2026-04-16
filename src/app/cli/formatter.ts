import type { PipelineResult } from "@app/pipeline/orchestrator.js"
import { logger } from "@infra/logger.js"

const SEPARATOR_WIDTH = 50

function formatDuration(ms: number): string {
	const seconds = ms / 1000
	if (seconds >= 60) {
		return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`
	}
	return `${seconds.toFixed(1)}s`
}

export function formatResult(result: PipelineResult) {
	logger.log("")
	logger.log("─".repeat(SEPARATOR_WIDTH))

	if (result.success) {
		logger.success("Analysis completed successfully!")
	} else {
		logger.warn("Analysis completed with errors")
	}

	logger.log("")
	logger.log(`  Output:   ${result.outputDir}`)
	logger.log(`  Duration: ${formatDuration(result.duration)}`)

	if (result.aspects) {
		const { succeeded, failed } = result.aspects
		if (failed.length > 0) {
			logger.log(`  Aspects:  ${succeeded.length} succeeded, ${failed.length} failed`)
			logger.log(`    Failed: ${failed.join(", ")}`)
		} else {
			logger.log(`  Aspects:  ${succeeded.length}/${succeeded.length + failed.length} succeeded`)
		}
	}

	if (result.filesWritten && result.filesWritten.length > 0) {
		logger.log("  Files:")
		for (const file of result.filesWritten) {
			logger.log(`    - ${file}`)
		}
	}

	if (result.usage) {
		logger.log("")
		logger.log(`  LLM Calls:  ${result.usage.totalCalls}`)
		logger.log(
			`  Tokens:     ${result.usage.totalTokens.toLocaleString()} (in: ${result.usage.totalInputTokens.toLocaleString()}, out: ${result.usage.totalOutputTokens.toLocaleString()})`,
		)
		if (result.usage.totalReasoningTokens > 0) {
			logger.log(`  Reasoning:  ${result.usage.totalReasoningTokens.toLocaleString()}`)
		}
		if (result.usage.records && result.usage.records.length > 0) {
			logger.log("  Per-analyzer:")
			for (const record of result.usage.records) {
				const tokens = record.inputTokens + record.outputTokens
				logger.log(`    ${record.analyzer}: ${tokens.toLocaleString()} tokens`)
			}
		}
	}

	if (result.errors.length > 0) {
		logger.log("")
		logger.warn(`${result.errors.length} error(s):`)
		for (const error of result.errors) {
			logger.error(`  [${error.phase}] ${error.message}`)
		}
	}

	logger.log("─".repeat(SEPARATOR_WIDTH))
	logger.log("")
}
