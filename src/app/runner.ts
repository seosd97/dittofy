import type { AspectName, AspectTypeMap } from "@defs/aspect-map.js"
import type { AspectDescriptor } from "@defs/descriptor.js"
import type { CodeChunk, FileTreeNode } from "@defs/extraction.js"
import { buildContext } from "@domain/analysis/context-builder.js"
import type { ContextBuildResult } from "@domain/analysis/context-builder.js"
import { ANALYSIS_PRINCIPLES, buildSystemPrompt } from "@domain/llm-prompts/index.js"
import type { ILLMClient } from "@infra/llm/client.js"
import type { UsageTracker } from "@infra/llm/usage.js"
import { logger } from "@infra/logger.js"

export interface RunAnalyzerOptions {
	/** File paths selected by analysis plan (wave executor) */
	filePaths: string[]
	/** Markdown summary of prior wave results for cross-aspect consistency */
	crossAspectContext?: string
}

/**
 * Generic analyzer runner.
 * Takes an AspectDescriptor's analyzer config, calls the LLM, records usage, and returns the result.
 * Operates in batch-split mode when chunkedAnalysis is configured.
 */
export async function runAnalyzer<K extends AspectName>(
	descriptor: AspectDescriptor<K>,
	codeChunks: CodeChunk[],
	fileTree: FileTreeNode[],
	client: ILLMClient,
	usage: UsageTracker,
	outputLanguage: "en" | "ko",
	options: RunAnalyzerOptions,
): Promise<AspectTypeMap[K]> {
	const { analyzer } = descriptor

	const context = buildContext(codeChunks, fileTree, {
		filePaths: options.filePaths,
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
			options.crossAspectContext,
		)
	}

	const crossCtx = options.crossAspectContext ? `${options.crossAspectContext}\n\n` : ""

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

	// Fallback to a single call when there is only one chunk (avoid overhead)
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

	const validated = results.filter((r) => {
		if (chunkedAnalysis.chunkSchema) {
			const parsed = chunkedAnalysis.chunkSchema.safeParse(r)
			if (!parsed.success) {
				logger.warn(
					`[${descriptor.displayName}] Dropping malformed chunk: ${parsed.error.issues[0]?.message ?? "validation failed"}`,
				)
				return false
			}
		}
		return true
	})

	if (validated.length === 0) {
		throw new Error(`[${descriptor.displayName}] All ${chunks.length} chunks failed validation`)
	}

	return chunkedAnalysis.merge(validated)
}
