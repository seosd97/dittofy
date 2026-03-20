import { ASPECT_REGISTRY } from "@aspects/registry.js"
import type { AnalysisResultMap, AspectName } from "@defs/aspect-map.js"
import type { AspectDescriptor } from "@defs/descriptor.js"
import type { CodeChunk } from "@defs/extraction.js"
import type { ILLMClient } from "@llm/client.js"
import { runAnalyzer } from "@llm/runner.js"
import type { UsageTracker } from "@llm/usage.js"
import type { ExtractionOutput } from "@source/index.js"
import { logger } from "@utils/logger.js"
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
	const sections: string[] = []

	if (results.designTokens) {
		const t = results.designTokens
		const parts: string[] = []
		const colorCount = t.colorGroups?.reduce((sum, g) => sum + g.tokens.length, 0) ?? 0
		if (colorCount > 0) parts.push(`${colorCount} color tokens`)
		if (t.spacing.length > 0) parts.push(`${t.spacing.length} spacing values`)
		if (t.borderRadius.length > 0) parts.push(`${t.borderRadius.length} border-radius tiers`)
		if (t.breakpoints.length > 0) {
			const bpList = t.breakpoints.map((b) => `${b.name}: ${b.value}`).join(", ")
			parts.push(`breakpoints: ${bpList}`)
		}
		if (t.shadows.length > 0) parts.push(`${t.shadows.length} shadow levels`)
		if (t.zIndex.length > 0) parts.push(`${t.zIndex.length} z-index values`)

		if (parts.length > 0) {
			sections.push(`### Design Tokens (confirmed)\n${parts.map((p) => `- ${p}`).join("\n")}`)
		}
	}

	if (results.typography) {
		const ty = results.typography
		const parts: string[] = []
		if (ty.fontFamilies?.length > 0) {
			parts.push(`Font families: ${ty.fontFamilies.join(", ")}`)
		}
		if (ty.scale.length > 0) parts.push(`${ty.scale.length} type scale entries`)
		if (ty.fontWeights.length > 0) parts.push(`${ty.fontWeights.length} font weights`)

		if (parts.length > 0) {
			sections.push(`### Typography (confirmed)\n${parts.map((p) => `- ${p}`).join("\n")}`)
		}
	}

	if (results.layoutSystem) {
		const l = results.layoutSystem
		const parts: string[] = []
		parts.push(`Approach: ${l.approach}`)
		if (l.containers.length > 0) parts.push(`${l.containers.length} containers`)
		if (l.grids.length > 0) parts.push(`${l.grids.length} grid systems`)
		if (l.navigation.length > 0) parts.push(`${l.navigation.length} navigation patterns`)

		sections.push(`### Layout System (confirmed)\n${parts.map((p) => `- ${p}`).join("\n")}`)
	}

	if (results.componentCatalog) {
		const c = results.componentCatalog
		const parts: string[] = []
		const core = c.components.filter((x) => x.tier === "core")
		const ds = c.components.filter((x) => x.tier === "design-system")
		parts.push(
			`${c.components.length} components (core: ${core.length}, design-system: ${ds.length})`,
		)
		if (c.patterns.length > 0) {
			parts.push(`Patterns: ${c.patterns.map((p) => p.name).join(", ")}`)
		}
		sections.push(`### Component Catalog (confirmed)\n${parts.map((p) => `- ${p}`).join("\n")}`)
	}

	if (results.pageStructures) {
		const p = results.pageStructures
		const parts: string[] = []
		parts.push(`${p.pages.length} pages`)
		if (p.patterns && p.patterns.length > 0) {
			parts.push(`Patterns: ${p.patterns.map((pt) => pt.name).join(", ")}`)
		}
		sections.push(`### Page Structures (confirmed)\n${parts.map((p) => `- ${p}`).join("\n")}`)
	}

	if (results.responsiveStrategy) {
		const r = results.responsiveStrategy
		const parts: string[] = []
		if (r.approach) parts.push(`Approach: ${r.approach}`)
		if (r.breakpoints.length > 0) {
			parts.push(`Breakpoints: ${r.breakpoints.map((b) => `${b.name}: ${b.value}`).join(", ")}`)
		}
		sections.push(`### Responsive Strategy (confirmed)\n${parts.map((p) => `- ${p}`).join("\n")}`)
	}

	if (results.interactionPatterns) {
		const ip = results.interactionPatterns
		const parts: string[] = []
		if (ip.animations.length > 0) parts.push(`${ip.animations.length} animations`)
		if (ip.transitions.length > 0) parts.push(`${ip.transitions.length} transitions`)
		sections.push(`### Interaction Patterns (confirmed)\n${parts.map((p) => `- ${p}`).join("\n")}`)
	}

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
