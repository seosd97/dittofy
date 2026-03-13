export interface PromptSet {
	steps: PromptStep[]
	readme: string
	outputDir: string
}

export interface PromptStep {
	stepNumber: number
	stepType: StepType
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
	| "design-tokens"
	| "typography"
	| "layout-shell"
	| "showcase-pages"
	| "responsive"
	| "interactions"

export interface StepPlanEntry {
	stepNumber: number
	stepType: StepType
	title: string
	scope: string
	dependencies: number[]
}
