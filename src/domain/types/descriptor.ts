import type { PresetName } from "@domain/constants/target-presets.js"
import type { SystemPromptConfig } from "@domain/llm-prompts/index.js"
import type { z } from "zod"
import type { AnalysisResult } from "./analysis.js"
import type { AspectName, AspectTypeMap } from "./aspect-map.js"
/** Individual chunk target for chunked analysis */
export interface ChunkTarget {
	label: string
	context: string
}

/** Symbolic step dependency reference */
export type StepDependencyRef =
	| { kind: "type"; stepType: string }
	| { kind: "all-of-type"; stepType: string }

/** Implementation steps declared by an aspect */
export interface StepDeclaration {
	stepType: string
	title: string
	scope: string
	dependsOn: StepDependencyRef[]
	contract?: import("@domain/rendering/step-contracts.js").StepContract
	renderPrompt?: (ctx: import("@defs/templates.js").PromptTemplateContext) => string
}

/** Document generation declaration */
export interface DocDeclaration {
	filename: string
	title: string
	category: "core" | "dynamic"
	renderDoc?: (ctx: import("@defs/templates.js").TemplateContext) => string | null
}

/** Type-safe chunked analysis configuration */
export interface ChunkedAnalysisConfig<K extends AspectName, ChunkType = unknown> {
	chunkPreset: PresetName
	chunkSchema: z.ZodType<ChunkType>
	chunkSchemaName: string
	batchSize: number
	extractChunks: (codeContext: string) => ChunkTarget[]
	buildChunkPrompt: (basePrompt: string, chunk: ChunkTarget) => string
	merge: (chunks: ChunkType[]) => AspectTypeMap[K]
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
		/** Optional: split a large schema into batches, call LLM per batch, then merge */
		chunkedAnalysis?: ChunkedAnalysisConfig<K>
	}

	/** Step Planning 설정 */
	planning: {
		docs: DocDeclaration[]
		planSteps: (analysis: AnalysisResult) => StepDeclaration[]
	}
}
