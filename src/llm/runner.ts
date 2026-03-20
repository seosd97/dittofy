import type { AspectName, AspectTypeMap } from "@defs/aspect-map.js"
import type { AspectDescriptor } from "@defs/descriptor.js"
import type { CodeChunk, FileTreeNode } from "@defs/extraction.js"
import type { ILLMClient } from "@llm/client.js"
import { buildContext } from "@llm/context.js"
import type { ContextBuildResult } from "@llm/context.js"
import { ANALYSIS_PRINCIPLES, buildSystemPrompt } from "@llm/prompts.js"
import type { UsageTracker } from "@llm/usage.js"
import { logger } from "@utils/logger.js"

export interface RunAnalyzerOptions {
	/** File paths selected by analysis plan (wave executor) */
	filePaths?: string[]
	/** Markdown summary of prior wave results for cross-aspect consistency */
	crossAspectContext?: string
}

/**
 * 제네릭 analyzer runner.
 * AspectDescriptor의 analyzer 설정을 받아 LLM 호출 → 사용량 기록 → 결과 반환.
 * chunkedAnalysis가 설정되어 있으면 배치 분할 모드로 동작.
 */
export async function runAnalyzer<K extends AspectName>(
	descriptor: AspectDescriptor<K>,
	codeChunks: CodeChunk[],
	fileTree: FileTreeNode[],
	client: ILLMClient,
	usage: UsageTracker,
	outputLanguage: "en" | "ko" = "en",
	options?: RunAnalyzerOptions,
): Promise<AspectTypeMap[K]> {
	const { analyzer } = descriptor

	// Build context: use filePaths from plan if available, otherwise fall back to existing logic
	const context = buildContext(codeChunks, fileTree, {
		filePaths: options?.filePaths,
	})

	const systemPrompt = buildSystemPrompt({
		...analyzer.promptConfig,
		additionalPrinciples: [
			...ANALYSIS_PRINCIPLES,
			...(analyzer.promptConfig.additionalPrinciples ?? []),
		],
		outputLanguage,
	})

	if (analyzer.chunkedAnalysis) {
		return await runChunkedAnalysis(
			descriptor,
			context,
			systemPrompt,
			client,
			usage,
			options?.crossAspectContext,
		)
	}

	const crossCtx = options?.crossAspectContext ? `${options.crossAspectContext}\n\n` : ""

	const prompt = `${crossCtx}## Source Code\n${context.codeContext}`

	const result = await client.call({
		preset: analyzer.preset,
		system: systemPrompt,
		prompt,
		schema: analyzer.schema,
		schemaName: analyzer.schemaName,
		schemaDescription: analyzer.schemaDescription,
	})

	usage.record("Analysis", descriptor.displayName, result.usage)
	return result.data
}

async function runChunkedAnalysis<K extends AspectName>(
	descriptor: AspectDescriptor<K>,
	context: ContextBuildResult,
	systemPrompt: string,
	client: ILLMClient,
	usage: UsageTracker,
	crossAspectContext?: string,
): Promise<AspectTypeMap[K]> {
	const { chunkedAnalysis } = descriptor.analyzer
	if (!chunkedAnalysis) throw new Error("chunkedAnalysis config missing")

	const chunks = chunkedAnalysis.extractChunks(context.codeContext)

	const crossCtx = crossAspectContext ? `${crossAspectContext}\n\n` : ""

	// 청크가 1개면 단일 호출로 fallback (오버헤드 방지)
	if (chunks.length <= 1) {
		const prompt = `${crossCtx}## Source Code\n${context.codeContext}`

		const result = await client.call({
			preset: descriptor.analyzer.preset,
			system: systemPrompt,
			prompt,
			schema: descriptor.analyzer.schema,
			schemaName: descriptor.analyzer.schemaName,
			schemaDescription: descriptor.analyzer.schemaDescription,
		})
		usage.record("Analysis", descriptor.displayName, result.usage)
		return result.data
	}

	logger.info(`[${descriptor.displayName}] Chunked analysis: ${chunks.length} batches`)

	const basePrompt = `${crossCtx}`
	const results: unknown[] = []

	for (const chunk of chunks) {
		try {
			const chunkPrompt = chunkedAnalysis.buildChunkPrompt(basePrompt, chunk)
			const result = await client.call({
				preset: chunkedAnalysis.chunkPreset,
				system: systemPrompt,
				prompt: chunkPrompt,
				schema: chunkedAnalysis.chunkSchema,
				schemaName: `${chunkedAnalysis.chunkSchemaName} (${chunk.label})`,
			})
			usage.record("Analysis", `${descriptor.displayName} - ${chunk.label}`, result.usage)
			results.push(result.data)
		} catch (error) {
			logger.warn(
				`[${descriptor.displayName}] Chunk "${chunk.label}" failed: ${error instanceof Error ? error.message : String(error)}. Skipping.`,
			)
		}
	}

	if (results.length === 0) {
		throw new Error(`[${descriptor.displayName}] All ${chunks.length} chunks failed`)
	}

	if (results.length < chunks.length) {
		logger.warn(
			`[${descriptor.displayName}] ${chunks.length - results.length}/${chunks.length} chunks failed, merging partial results`,
		)
	}

	return chunkedAnalysis.merge(results)
}
