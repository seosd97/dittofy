import { PROMPT_GEN } from "../../constants/prompt-gen.js"
import type { AnalysisResult } from "../../types/analysis.js"
import type { StepPlan, StepPlanEntry } from "../../types/prompts.js"
import { logger } from "../../utils/logger.js"

export function planSteps(analysis: AnalysisResult): StepPlan {
	const steps: StepPlanEntry[] = []
	let stepNumber = 1

	// Step 1: Project Setup (always included)
	steps.push({
		stepNumber: stepNumber++,
		stepType: "setup",
		title: "Project Setup",
		scope: "Initialize project with correct framework, dependencies, and build tooling",
		dependencies: [],
	})

	// Step 2: Design System (always included)
	steps.push({
		stepNumber: stepNumber++,
		stepType: "design-system",
		title: "Design System",
		scope: "Implement design tokens, typography scale, color palette, and base styles",
		dependencies: [1],
	})

	// Component steps: split into groups of ~5
	const components = analysis.componentCatalog?.components ?? []
	if (components.length > 0) {
		const groupSize = PROMPT_GEN.componentsPerStep
		const groupCount = Math.ceil(components.length / groupSize)

		for (let i = 0; i < groupCount; i++) {
			const start = i * groupSize
			const end = Math.min(start + groupSize, components.length)
			const groupComponents = components.slice(start, end)
			const names = groupComponents.map((c) => c.name)

			steps.push({
				stepNumber: stepNumber++,
				stepType: "components",
				title: `Components (${i + 1}/${groupCount})`,
				scope: `Implement components: ${names.join(", ")}`,
				dependencies: [1, 2],
				componentNames: names,
			})
		}
	}

	// Page implementation step
	if ((analysis.pageStructures?.pages.length ?? 0) > 0) {
		const componentStepNumbers = steps
			.filter((s) => s.stepType === "components")
			.map((s) => s.stepNumber)

		steps.push({
			stepNumber: stepNumber++,
			stepType: "pages",
			title: "Page Implementation",
			scope: "Implement page layouts, routing, and page-level composition of components",
			dependencies: [1, 2, ...componentStepNumbers],
		})
	}

	// Responsive step
	if (
		analysis.responsiveStrategy?.approach.value &&
		(analysis.responsiveStrategy?.patterns.length ?? 0) > 0
	) {
		const pageStep = steps.find((s) => s.stepType === "pages")
		const designSystemStep = steps.find((s) => s.stepType === "design-system")
		const deps = [1]
		if (designSystemStep) deps.push(designSystemStep.stepNumber)
		if (pageStep) deps.push(pageStep.stepNumber)

		steps.push({
			stepNumber: stepNumber++,
			stepType: "responsive",
			title: "Responsive Design",
			scope: "Implement responsive breakpoints, media queries, and adaptive layouts",
			dependencies: deps,
		})
	}

	// Interactions step
	if (
		(analysis.interactionPatterns?.animations.length ?? 0) > 0 ||
		(analysis.interactionPatterns?.transitions.length ?? 0) > 0 ||
		(analysis.interactionPatterns?.gestures.length ?? 0) > 0
	) {
		const pageStep = steps.find((s) => s.stepType === "pages")
		const designSystemStep = steps.find((s) => s.stepType === "design-system")
		const deps = [1]
		if (designSystemStep) deps.push(designSystemStep.stepNumber)
		if (pageStep) deps.push(pageStep.stepNumber)

		steps.push({
			stepNumber: stepNumber++,
			stepType: "interactions",
			title: "Interactions & Animations",
			scope: "Implement animations, transitions, hover effects, and gesture interactions",
			dependencies: deps,
		})
	}

	if (analysis.failedAnalyzers.length > 0) {
		logger.warn(
			`Step planner: ${analysis.failedAnalyzers.length} analyzers failed (${analysis.failedAnalyzers.join(", ")}). Some implementation steps may be missing.`,
		)
	}

	const limitedSteps = steps.slice(0, PROMPT_GEN.maxSteps)

	return {
		totalSteps: limitedSteps.length,
		steps: limitedSteps,
	}
}
