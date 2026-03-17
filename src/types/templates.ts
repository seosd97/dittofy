import type { AnalysisResult } from "./analysis.js"

export interface TemplateContext {
	analysis: AnalysisResult
	env: import("@pipeline/assembly/resolve-environment.js").EnvironmentProfile
	structure: import("@pipeline/assembly/resolve-structure.js").ProjectStructure
	language: "ko" | "en"
}

export type DocTemplate = (ctx: TemplateContext) => string | null

export type PromptTemplate = (ctx: PromptTemplateContext) => string

export interface PromptTemplateContext extends TemplateContext {
	stepNumber: number
	dependencies: number[]
	stepTitles: Map<number, string>
}
