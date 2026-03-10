import type { PipelineResult } from "../pipeline/orchestrator.js"
import { logger } from "../utils/logger.js"

export function formatResult(result: PipelineResult) {
	logger.log("")
	logger.log("─".repeat(50))

	if (result.success) {
		logger.success("Analysis completed successfully!")
	} else {
		logger.warn("Analysis completed with errors")
	}

	logger.log("")
	logger.log(`  Output:   ${result.outputDir}`)

	const duration = result.duration / 1000
	const durationStr =
		duration >= 60
			? `${Math.floor(duration / 60)}m ${(duration % 60).toFixed(0)}s`
			: `${duration.toFixed(1)}s`
	logger.log(`  Duration: ${durationStr}`)

	if (result.usage) {
		logger.log(`  LLM Calls: ${result.usage.totalCalls}`)
		logger.log(
			`  Tokens:    ${result.usage.totalTokens.toLocaleString()} (in: ${result.usage.totalInputTokens.toLocaleString()}, out: ${result.usage.totalOutputTokens.toLocaleString()})`,
		)
	}

	if (result.errors.length > 0) {
		logger.log("")
		logger.warn(`${result.errors.length} error(s):`)
		for (const error of result.errors) {
			logger.error(`  [${error.phase}] ${error.message}`)
		}
	}

	logger.log("─".repeat(50))
	logger.log("")
}
