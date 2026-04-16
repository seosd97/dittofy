import type { StepDeclaration, StepDependencyRef } from "./descriptor.js"

export type { StepDeclaration, StepDependencyRef }

/** Infrastructure step (fixed step not tied to a specific aspect) */
export interface InfraStepDeclaration extends StepDeclaration {
	alwaysInclude: true
}

/** Document planning result */
export interface DocumentPlanResult {
	filename: string
	title: string
	include: boolean
	reason?: string
}
