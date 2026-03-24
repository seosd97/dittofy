import type { AnalysisResult } from "@defs/analysis.js"
import type { StepDeclaration, StepDependencyRef } from "@defs/descriptor.js"
import type { ResolvedStep, StepPlan, StepPlanEntry } from "@defs/prompts.js"
import { ASPECT_NAMES, ASPECT_REGISTRY } from "@domain/aspects/registry.js"
import { renderSetupPrompt } from "@domain/rendering/setup-prompt.js"
import { getStepContract } from "@domain/rendering/step-contracts.js"
import { logger } from "@infra/logger.js"

const MAX_STEPS = 12

/** Priority order for step types — lower number = higher priority */
const STEP_PRIORITY: Record<string, number> = {
	setup: 1,
	"design-tokens": 2,
	typography: 3,
	"layout-shell": 4,
	components: 5,
	"showcase-pages": 6,
	responsive: 7,
	interactions: 8,
}

/** Infrastructure steps (always included, not aspect-driven) */
const INFRA_STEPS: StepDeclaration[] = [
	{
		stepType: "setup",
		title: "Project Setup",
		scope: "Initialize project with correct framework, dependencies, and build tooling",
		dependsOn: [],
		contract: getStepContract("setup"),
		renderPrompt: renderSetupPrompt,
	},
]

/**
 * 2-pass step planner:
 * Pass 1: Collect step declarations from infra + aspects
 * Pass 2: Resolve symbolic dependencies to concrete step numbers
 */
export function planSteps(analysis: AnalysisResult): StepPlan {
	// Pass 1: Collect all step declarations
	const declarations: StepDeclaration[] = [...INFRA_STEPS]

	for (const name of ASPECT_NAMES) {
		const descriptor = ASPECT_REGISTRY[name]
		const aspectSteps = descriptor.planning.planSteps(analysis)
		declarations.push(...aspectSteps)
	}

	// Sort by criticality priority (stable sort preserves order within same priority)
	declarations.sort(
		(a, b) => (STEP_PRIORITY[a.stepType] ?? 100) - (STEP_PRIORITY[b.stepType] ?? 100),
	)

	// Warn if truncation will occur
	if (declarations.length > MAX_STEPS) {
		const dropped = declarations.slice(MAX_STEPS)
		const droppedNames = dropped.map((d) => d.stepType)
		logger.warn(
			`Step limit reached (${MAX_STEPS}): dropped ${dropped.length} steps: ${droppedNames.join(", ")}`,
		)
	}

	// Pass 2: Assign step numbers and resolve dependencies
	const entries: StepPlanEntry[] = []
	const resolved: ResolvedStep[] = []
	const stepsByType = new Map<string, number[]>()

	for (let i = 0; i < declarations.length && i < MAX_STEPS; i++) {
		const decl = declarations[i]
		const stepNumber = i + 1

		// Track step numbers by type
		const existing = stepsByType.get(decl.stepType) ?? []
		existing.push(stepNumber)
		stepsByType.set(decl.stepType, existing)

		// Resolve symbolic dependencies
		const dependencies = resolveDependencies(decl.dependsOn, stepsByType)

		const entry: StepPlanEntry = {
			stepNumber,
			stepType: decl.stepType as StepPlanEntry["stepType"],
			title: decl.title,
			scope: decl.scope,
			dependencies,
		}

		entries.push(entry)
		resolved.push({ planEntry: entry, declaration: decl })
	}

	if (analysis.failedAnalyzers.length > 0) {
		logger.warn(
			`Step planner: ${analysis.failedAnalyzers.length} analyzers failed (${analysis.failedAnalyzers.join(", ")}). Some implementation steps may be missing.`,
		)
	}

	return {
		totalSteps: entries.length,
		steps: entries,
		resolved,
	}
}

function resolveDependencies(
	refs: StepDependencyRef[],
	stepsByType: Map<string, number[]>,
): number[] {
	const resolved: number[] = []

	for (const ref of refs) {
		const numbers = stepsByType.get(ref.stepType) ?? []
		if (ref.kind === "type") {
			// First step of this type
			if (numbers.length > 0) {
				resolved.push(numbers[0])
			}
		} else if (ref.kind === "all-of-type") {
			// All steps of this type
			resolved.push(...numbers)
		}
	}

	return [...new Set(resolved)].sort((a, b) => a - b)
}
