export interface PromptSet {
	steps: PromptStep[]
	readme: string
	outputDir: string
}

export interface PromptStep {
	stepNumber: number
	filename: string
	title: string
	content: string
	dependencies: number[]
	estimatedComplexity: "low" | "medium" | "high"
}

export interface StepPlan {
	totalSteps: number
	steps: StepPlanEntry[]
}

export type StepType =
	| "setup"
	| "design-system"
	| "components"
	| "pages"
	| "responsive"
	| "interactions"

export interface StepPlanEntry {
	stepNumber: number
	stepType: StepType
	title: string
	scope: string
	dependencies: number[]
	/** Component names for "components" stepType steps */
	componentNames?: string[]
}
