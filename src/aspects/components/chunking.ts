import type { ChunkTarget } from "@defs/descriptor.js"
import { z } from "zod"
import { type ComponentCatalog, componentInfoSchema, componentPatternSchema } from "./schema.js"

const DEFAULT_BATCH_SIZE = 5

/** 청크 분석용 스키마 (consistency 제외) */
export const componentChunkSchema = z.object({
	components: z.array(componentInfoSchema),
	patterns: z.array(componentPatternSchema),
})

export type ComponentChunk = z.infer<typeof componentChunkSchema>

/**
 * codeContext에서 컴포넌트 파일 블록을 추출하여 배치별 ChunkTarget으로 분할.
 * 컨텍스트 형식: `--- path (category) ---\n<content>`
 */
export function extractComponentChunks(
	codeContext: string,
	batchSize = DEFAULT_BATCH_SIZE,
): ChunkTarget[] {
	const blocks = parseCodeBlocks(codeContext)
	if (blocks.length === 0) {
		return [{ label: "all", context: codeContext }]
	}

	// 배치로 그룹화
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
 * 배치별 프롬프트 생성.
 * 기본 프롬프트(파일 구조 + 설정)에 해당 배치의 소스 코드만 추가.
 */
export function buildComponentChunkPrompt(basePrompt: string, chunk: ChunkTarget): string {
	return `${basePrompt}\n\n## Source Code\n${chunk.context}`
}

/**
 * 배치 결과를 하나의 ComponentCatalog로 병합.
 * components는 name 기반 dedup (상세도 높은 엔트리 선호),
 * patterns는 이름 기준 중복 제거.
 */
export function mergeComponentChunks(chunks: unknown[]): ComponentCatalog {
	const componentMap = new Map<string, ComponentChunk["components"][number]>()
	for (const chunk of chunks as ComponentChunk[]) {
		for (const comp of chunk.components) {
			const existing = componentMap.get(comp.name)
			if (!existing || componentDetailScore(comp) > componentDetailScore(existing)) {
				componentMap.set(comp.name, comp)
			}
		}
	}

	const patternMap = new Map<string, ComponentChunk["patterns"][number]>()
	for (const chunk of chunks as ComponentChunk[]) {
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

/** 더 풍부한 데이터를 가진 엔트리에 높은 점수 */
function componentDetailScore(c: ComponentChunk["components"][number]): number {
	let score = c.variants.length
	if (c.variantSpecs) score += c.variantSpecs.length * 2
	if (c.states) score += c.states.length * 2
	if (c.sizes) score += c.sizes.length
	return score
}
