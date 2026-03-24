import type { SystemPromptConfig } from "@domain/llm-prompts/index.js"
import type { PresetName } from "@infra/llm/presets.js"
import type { z } from "zod"
import type { AnalysisResult } from "./analysis.js"
import type { AspectName, AspectTypeMap } from "./aspect-map.js"
/** 청크 분할 분석의 개별 청크 대상 */
export interface ChunkTarget {
	label: string
	context: string
}

/** Step 의존성 참조 (심볼릭) */
export type StepDependencyRef =
	| { kind: "type"; stepType: string }
	| { kind: "all-of-type"; stepType: string }

/** Aspect가 선언하는 구현 단계 */
export interface StepDeclaration {
	stepType: string
	title: string
	scope: string
	dependsOn: StepDependencyRef[]
	contract?: import("@domain/rendering/step-contracts.js").StepContract
	renderPrompt?: (ctx: import("@defs/templates.js").PromptTemplateContext) => string
}

/** 문서 생성 선언 */
export interface DocDeclaration {
	filename: string
	title: string
	category: "core" | "dynamic"
	renderDoc?: (ctx: import("@defs/templates.js").TemplateContext) => string | null
}

/** Aspect Descriptor — 각 디자인 측면의 자기완결적 기술 */
export interface AspectDescriptor<K extends AspectName> {
	name: K
	displayName: string

	/** Analyzer 설정 */
	analyzer: {
		preset: PresetName
		schema: z.ZodType<AspectTypeMap[K]>
		schemaName: string
		schemaDescription: string
		promptConfig: SystemPromptConfig
		/** Optional: 큰 스키마를 배치 단위로 분할하여 LLM 호출 후 병합 */
		chunkedAnalysis?: {
			chunkPreset: PresetName
			chunkSchema: z.ZodType
			chunkSchemaName: string
			batchSize: number
			extractChunks: (codeContext: string) => ChunkTarget[]
			buildChunkPrompt: (basePrompt: string, chunk: ChunkTarget) => string
			merge: (chunks: unknown[]) => AspectTypeMap[K]
		}
	}

	/** Step Planning 설정 */
	planning: {
		docs: DocDeclaration[]
		planSteps: (analysis: AnalysisResult) => StepDeclaration[]
	}
}
