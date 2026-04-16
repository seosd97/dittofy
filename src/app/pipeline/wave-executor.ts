import { runAnalyzer } from "@app/runner.js"
import type { AnalysisResultMap, AspectName } from "@defs/aspect-map.js"
import type { AspectDescriptor } from "@defs/descriptor.js"
import type { CodeChunk, ExtractionOutput } from "@defs/extraction.js"
import type { AnalysisPlan } from "@domain/analysis/plan-parser.js"
import { ASPECT_REGISTRY } from "@domain/aspects/registry.js"
import { summarizeResults } from "@domain/rendering/aspect-summarizer.js"
import type { ILLMClient } from "@infra/llm/client.js"
import type { UsageTracker } from "@infra/llm/usage.js"
import { type ProgressTracker, createProgressTracker } from "@infra/progress.js"
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
	progress?: ProgressTracker
}

export async function executeWaves(
	options: WaveExecutorOptions,
): Promise<{ results: AnalysisResultMap; failedAnalyzers: string[] }> {
	const { plan, codeChunks, extraction, workspace, client, usage, language, concurrency } = options
	const progress = options.progress ?? createProgressTracker()

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

	const totalAspects = plan.aspects.length
	progress.start(plan.waves.length, totalAspects)

	for (const wave of plan.waves) {
		const waveStart = Date.now()
		progress.startWave(wave.order, wave.aspects)

		const crossCtx = buildCrossAspectContext(results)
		const withLimit = createConcurrencyLimiter(concurrency)

		const promises = wave.aspects.map((aspectName) => {
			const descriptor = ASPECT_REGISTRY[aspectName]
			if (!descriptor) {
				return Promise.resolve()
			}

			return withLimit(async () => {
				const filePaths = plan.fileSelection[aspectName] ?? []
				progress.startAspect(aspectName, descriptor.displayName)
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

					await workspace.writeJSON(`result-${aspectName}.json`, result)
					progress.completeAspect(aspectName, descriptor.displayName)
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					progress.failAspect(aspectName, descriptor.displayName, message)
					failedAnalyzers.push(aspectName)
				}
			})
		})

		await Promise.allSettled(promises)

		const waveSucceeded =
			wave.aspects.length - wave.aspects.filter((a) => failedAnalyzers.includes(a)).length
		const waveElapsed = ((Date.now() - waveStart) / 1000).toFixed(1)
		progress.completeWave(wave.order, waveSucceeded, wave.aspects.length, `${waveElapsed}s`)
	}

	const succeededCount = totalAspects - failedAnalyzers.length
	progress.done(succeededCount, failedAnalyzers.length)

	return { results, failedAnalyzers }
}

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
