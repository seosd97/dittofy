import { runAnalyzer } from "@app/runner.js"
import type { AnalysisResultMap, AspectName } from "@defs/aspect-map.js"
import type { AspectDescriptor } from "@defs/descriptor.js"
import type { CodeChunk } from "@defs/extraction.js"
import type { ExtractionOutput } from "@defs/extraction.js"
import type { AnalysisPlan } from "@domain/analysis/plan-parser.js"
import { ASPECT_REGISTRY } from "@domain/aspects/registry.js"
import { summarizeResults } from "@domain/rendering/aspect-summarizer.js"
import type { ILLMClient } from "@infra/llm/client.js"
import type { UsageTracker } from "@infra/llm/usage.js"
import { logger } from "@infra/logger.js"
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
		const waveStart = Date.now()

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
				const filePaths = plan.fileSelection[aspectName] ?? []
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

		const waveSucceeded =
			wave.aspects.length - wave.aspects.filter((a) => failedAnalyzers.includes(a)).length
		const waveElapsed = ((Date.now() - waveStart) / 1000).toFixed(1)
		logger.info(
			`Wave ${wave.order} complete: ${waveSucceeded}/${wave.aspects.length} succeeded [${waveElapsed}s]`,
		)
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

	function acquire(): Promise<void> {
		if (active < limit) {
			active++
			return Promise.resolve()
		}
		return new Promise<void>((resolve) => queue.push(resolve))
	}

	function release(): void {
		active--
		if (queue.length > 0) {
			active++
			const next = queue.shift()
			if (next) next()
		}
	}

	return async <T>(fn: () => Promise<T>): Promise<T> => {
		await acquire()
		try {
			return await fn()
		} finally {
			release()
		}
	}
}
