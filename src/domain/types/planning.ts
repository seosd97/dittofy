import type { StepDeclaration, StepDependencyRef } from "./descriptor.js"

export type { StepDeclaration, StepDependencyRef }

/** Infrastructure 단계 (aspect가 아닌 고정 단계) */
export interface InfraStepDeclaration extends StepDeclaration {
	alwaysInclude: true
}

/** 문서 계획 결과 */
export interface DocumentPlanResult {
	filename: string
	title: string
	include: boolean
	reason?: string
}
