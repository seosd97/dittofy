import type { z } from "zod"
import type { DesignEssence } from "./analysis.js"
import type { AnalysisResult } from "./analysis.js"
import type { AspectName, AspectTypeMap } from "./aspect-map.js"
import type { FileCategory } from "./extraction.js"

/** LLM 호출 프리셋 이름 */
export type PresetName =
	| "tokenAnalyzer"
	| "typographyAnalyzer"
	| "componentAnalyzer"
	| "layoutAnalyzer"
	| "pageAnalyzer"
	| "responsiveAnalyzer"
	| "interactionAnalyzer"
	| "essenceSynthesizer"
	| "docGenerator"
	| "promptGenerator"

/** Analyzer에 전달할 컨텍스트 설정 */
export interface ContextConfig {
	filePriorities: FileCategory[]
	mustIncludePatterns: RegExp[]
	configRatio?: number
	codeRatio?: number
}

/** 시스템 프롬프트 구성 */
export interface SystemPromptConfig {
	role: string
	task: string
	additionalPrinciples?: string[]
	outputLanguage?: "ko" | "en"
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
}

/** 문서 생성 선언 */
export interface DocDeclaration {
	filename: string
	title: string
	category: "core" | "dynamic"
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
		contextConfig: ContextConfig
		promptConfig: SystemPromptConfig
	}

	/** Doc Generator 설정 */
	docGenerator: {
		filename: string
		title: string
		category: "core" | "dynamic"
		schema: z.ZodType
		schemaName: string
		schemaDescription: string
		canGenerate: (data: AspectTypeMap[K]) => boolean
		buildPrompt: (data: AspectTypeMap[K], essence: DesignEssence, lang: "ko" | "en") => string
		assembleDoc: (title: string, data: unknown) => string
	}

	/** Step Planning 설정 */
	planning: {
		docs: DocDeclaration[]
		planSteps: (analysis: AnalysisResult) => StepDeclaration[]
	}
}
