import type { AnalysisResult } from "@defs/analysis.js"
import type { PromptSet, PromptStep } from "@defs/prompts.js"
import type { PromptTemplateContext } from "@defs/templates.js"
import { COMPLEXITY_THRESHOLDS } from "@domain/constants/analysis.js"
import { generateReadme } from "@domain/rendering/readme-gen.js"
import type { EnvironmentProfile } from "@domain/rendering/resolve-environment.js"
import { logger } from "@infra/logger.js"
import { planSteps } from "./planners/steps.js"

const CRITICAL_STEPS = new Set(["setup", "design-tokens", "typography"])

export function assemblePrompts(
	analysis: AnalysisResult,
	env: EnvironmentProfile,
	language: "ko" | "en",
	outputDir: string,
): PromptSet {
	const stepPlan = planSteps(analysis)
	const stepTitles = new Map(stepPlan.steps.map((s) => [s.stepNumber, s.title]))

	const steps: PromptStep[] = []

	for (const { planEntry, declaration } of stepPlan.resolved) {
		const template = declaration.renderPrompt
		if (!template) {
			logger.warn(`No renderPrompt for step "${planEntry.stepType}" — skipping`)
			continue
		}

		const ctx: PromptTemplateContext = {
			analysis,
			env,
			structure: env.structure,
			language,
			stepNumber: planEntry.stepNumber,
			dependencies: planEntry.dependencies,
			stepTitles,
		}

		try {
			const content = template(ctx)
			const paddedNum = String(planEntry.stepNumber).padStart(2, "0")

			steps.push({
				stepNumber: planEntry.stepNumber,
				stepType: planEntry.stepType,
				filename: `step-${paddedNum}-${planEntry.stepType}.md`,
				title: planEntry.title,
				content,
				dependencies: planEntry.dependencies,
				estimatedComplexity: estimateComplexity(content),
			})
		} catch (error) {
			if (CRITICAL_STEPS.has(planEntry.stepType)) {
				throw error
			}
			const message = error instanceof Error ? error.message : String(error)
			logger.warn(`Prompt template for ${planEntry.stepType} failed: ${message}`)
		}
	}

	const promptSet: PromptSet = { steps, readme: "", outputDir }
	promptSet.readme = generateReadme(promptSet, env)

	validatePromptSet(steps)

	return promptSet
}

const FALLBACK_PATTERN = /\*No .+?(?:was|were) extracted/

function validatePromptSet(steps: PromptStep[]): void {
	if (steps.length === 0) return

	let fallbackCount = 0

	for (const step of steps) {
		const hasFallback = FALLBACK_PATTERN.test(step.content)
		if (hasFallback) {
			fallbackCount++
			if (CRITICAL_STEPS.has(step.stepType)) {
				logger.warn(
					`Critical step "${step.stepType}" contains fallback text — data may not have been extracted`,
				)
			}
		}
	}

	if (fallbackCount > steps.length / 2) {
		logger.warn(
			`${fallbackCount}/${steps.length} prompts contain fallback text — output quality may be degraded`,
		)
	}
}

function estimateComplexity(instructions: string): "low" | "medium" | "high" {
	const lineCount = instructions.split("\n").length
	if (lineCount > COMPLEXITY_THRESHOLDS.high) return "high"
	if (lineCount > COMPLEXITY_THRESHOLDS.medium) return "medium"
	return "low"
}
