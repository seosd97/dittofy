import { ASPECT_REGISTRY } from "@aspects/registry.js"
import type { AnalysisResultMap, AspectName } from "@defs/aspect-map.js"
import type { AspectDescriptor } from "@defs/descriptor.js"
import type { CodeChunk } from "@defs/extraction.js"
import type { ILLMClient } from "@llm/client.js"
import { runAnalyzer } from "@llm/runner.js"
import type { UsageTracker } from "@llm/usage.js"
import type { ExtractionOutput } from "@source/index.js"
import { logger } from "@utils/logger.js"
import { summarizeResults } from "./aspect-summarizer.js"
import type { AnalysisPlan } from "./plan-parser.js"
import type { Workspace } from "./workspace.js"

export interface WaveExecutorOptions {
	plan: AnalysisPlan
	codeChunks: CodeChunk[]
	extraction: ExtractionOutput
	workspace: Workspace
	client: ILLMClient
	usage: UsageTracker
	language: "en" | "ko"
	concurrency: number
}

export async function executeWaves(
	options: WaveExecutorOptions,
): Promise<{ results: AnalysisResultMap; failedAnalyzers: string[] }> {
	const { plan, codeChunks, extraction, workspace, client, usage, language, concurrency } = options

	const results: AnalysisResultMap = {
		designTokens: null,
		typography: null,
		componentCatalog: null,
		layoutSystem: null,
		pageStructures: null,
		responsiveStrategy: null,
		interactionPatterns: null,
	}
	const failedAnalyzers: string[] = []

	for (const wave of plan.waves) {
		logger.info(`Wave ${wave.order}: ${wave.aspects.join(", ")}`)

		// Build cross-aspect context from completed results
		const crossCtx = buildCrossAspectContext(results)

		// Run aspects in this wave with concurrency limit
		const withLimit = createConcurrencyLimiter(concurrency)

		const promises = wave.aspects.map((aspectName) => {
			const descriptor = ASPECT_REGISTRY[aspectName]
			if (!descriptor) {
				logger.warn(`Unknown aspect: ${aspectName}`)
				return Promise.resolve()
			}

			return withLimit(async () => {
				const filePaths = plan.fileSelection[aspectName]
				try {
					const result = await runAnalyzer(
						descriptor as AspectDescriptor<typeof aspectName>,
						codeChunks,
						extraction.extraction.fileTree,
						client,
						usage,
						language,
						{
							filePaths,
							crossAspectContext: crossCtx || undefined,
						},
					)
					;(results as Record<string, unknown>)[aspectName] = result

					// Save intermediate result to workspace
					await workspace.writeJSON(`result-${aspectName}.json`, result)
					logger.info(`  ${descriptor.displayName}: completed`)
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					logger.warn(`  ${descriptor.displayName} failed: ${message}`)
					failedAnalyzers.push(aspectName)
				}
			})
		})

		await Promise.allSettled(promises)
	}

	return { results, failedAnalyzers }
}

/**
 * Build a markdown summary of completed analysis results for cross-aspect context injection.
 */
export function buildCrossAspectContext(results: AnalysisResultMap): string {
	const sections = summarizeResults(results)
	if (sections.length === 0) return ""

	return `## Prior Analysis Results\n\n${sections.join("\n\n")}\n\nUse these as authoritative reference. Do not contradict these values.`
}

function createConcurrencyLimiter(limit: number) {
	let active = 0
	const queue: (() => void)[] = []

	function release() {
		active--
		if (queue.length > 0) {
			active++
			const next = queue.shift()
			if (next) next()
		}
	}

	return async <T>(fn: () => Promise<T>): Promise<T> => {
		if (active >= limit) {
			await new Promise<void>((resolve) => queue.push(resolve))
		} else {
			active++
		}
		try {
			return await fn()
		} finally {
			release()
		}
	}
}
