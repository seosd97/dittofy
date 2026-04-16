import type { ChunkTarget } from "@defs/descriptor.js"
import { z } from "zod"
import { type ComponentCatalog, componentInfoSchema, componentPatternSchema } from "./schema.js"

const DEFAULT_BATCH_SIZE = 5

/** Schema for chunk analysis (excluding consistency) */
export const componentChunkSchema = z.object({
	components: z.array(componentInfoSchema),
	patterns: z.array(componentPatternSchema),
})

export type ComponentChunk = z.infer<typeof componentChunkSchema>

/**
 * Extract component file blocks from codeContext and split into batched ChunkTargets.
 * Context format: `--- path (category) ---\n<content>`
 */
export function extractComponentChunks(
	codeContext: string,
	batchSize = DEFAULT_BATCH_SIZE,
): ChunkTarget[] {
	const blocks = parseCodeBlocks(codeContext)
	if (blocks.length === 0) {
		return [{ label: "all", context: codeContext }]
	}

	// Group into batches
	const chunks: ChunkTarget[] = []
	const totalBatches = Math.ceil(blocks.length / batchSize)

	for (let i = 0; i < blocks.length; i += batchSize) {
		const batch = blocks.slice(i, i + batchSize)
		const batchIndex = Math.floor(i / batchSize) + 1
		chunks.push({
			label: `batch ${batchIndex}/${totalBatches}`,
			context: batch.map((b) => b.raw).join("\n\n"),
		})
	}

	return chunks
}

interface CodeBlock {
	path: string
	raw: string
}

function parseCodeBlocks(codeContext: string): CodeBlock[] {
	const blockPattern = /---\s+(\S+)\s+\(\w+\)\s+---\n/g
	const blocks: CodeBlock[] = []

	const matches: { path: string; start: number }[] = []
	for (
		let match = blockPattern.exec(codeContext);
		match !== null;
		match = blockPattern.exec(codeContext)
	) {
		matches.push({ path: match[1], start: match.index })
	}

	for (let i = 0; i < matches.length; i++) {
		const start = matches[i].start
		const end = i + 1 < matches.length ? matches[i + 1].start : codeContext.length
		blocks.push({
			path: matches[i].path,
			raw: codeContext.slice(start, end).trimEnd(),
		})
	}

	return blocks
}

/**
 * Build per-batch prompt.
 * Appends only the batch's source code to the base prompt (file structure + config).
 */
export function buildComponentChunkPrompt(basePrompt: string, chunk: ChunkTarget): string {
	return `${basePrompt}\n\n## Source Code\n${chunk.context}`
}

/**
 * Merge batch results into a single ComponentCatalog.
 * Components are deduped by name (preferring entries with higher detail).
 * Patterns are deduped by name.
 */
export function mergeComponentChunks(chunks: unknown[]): ComponentCatalog {
	const componentMap = new Map<string, ComponentChunk["components"][number]>()
	const patternMap = new Map<string, ComponentChunk["patterns"][number]>()

	for (const raw of chunks) {
		const parsed = componentChunkSchema.safeParse(raw)
		if (!parsed.success) continue
		const chunk = parsed.data

		for (const comp of chunk.components) {
			const existing = componentMap.get(comp.name)
			if (!existing || componentDetailScore(comp) > componentDetailScore(existing)) {
				componentMap.set(comp.name, comp)
			}
		}

		for (const p of chunk.patterns) {
			if (!patternMap.has(p.name)) {
				patternMap.set(p.name, p)
			}
		}
	}

	return {
		components: [...componentMap.values()],
		patterns: [...patternMap.values()],
	}
}

/** Higher score for entries with richer data */
function componentDetailScore(c: ComponentChunk["components"][number]): number {
	let score = c.variants.length
	if (c.variantSpecs) score += c.variantSpecs.length * 2
	if (c.states) score += c.states.length * 2
	if (c.sizes) score += c.sizes.length
	return score
}
