import type { AnalysisResult } from "@defs/analysis.js"
import type { DocumentSet } from "@defs/documentation.js"
import type { PhaseError, PhaseResult } from "@defs/pipeline.js"
import type { PromptSet, PromptStep } from "@defs/prompts.js"
import type { UsageTracker } from "@llm/usage.js"
import { writePrompts } from "@output/prompts.js"
import { planSteps } from "@pipeline/planners/steps.js"
import { logger, phaseStart, phaseSuccess } from "@utils/logger.js"
import type { LanguageModel } from "ai"
import { injectContext } from "./context-injector.js"
import { generateDesignTokensPrompt } from "./generators/design-tokens-prompt.js"
import { generateInteractionsPrompt } from "./generators/interactions-prompt.js"
import { generateLayoutShellPrompt } from "./generators/layout-shell-prompt.js"
import { generateShowcasePagesPrompt } from "./generators/pages-prompt.js"
import { generateReadme } from "./generators/readme-gen.js"
import { generateResponsivePrompt } from "./generators/responsive-prompt.js"
import { generateSetupPrompt } from "./generators/setup-prompt.js"
import { generateTypographyPrompt } from "./generators/typography-prompt.js"
import { resolveEnvironment } from "./resolve-environment.js"

const CRITICAL_STEP_TYPES = new Set(["setup", "design-tokens", "typography"])

export async function runPromptGeneration(
	analysis: AnalysisResult,
	documents: DocumentSet,
	model: LanguageModel,
	usage: UsageTracker,
	outputDir: string,
): Promise<PhaseResult<PromptSet>> {
	const startTime = Date.now()
	const errors: PhaseError[] = []

	phaseStart("Phase 4", "Planning implementation steps")

	const env = resolveEnvironment(analysis.techStack)
	const stepPlan = planSteps(analysis)
	logger.info(`Planned ${stepPlan.totalSteps} implementation steps`)

	const steps: PromptStep[] = []
	const stepTitles = new Map<number, string>(
		stepPlan.steps.map((s) => [s.stepNumber, s.title]),
	)

	for (const planEntry of stepPlan.steps) {
		const context = injectContext(planEntry, analysis, documents)

		try {
			let step: PromptStep

			switch (planEntry.stepType) {
				case "setup":
					step = await generateSetupPrompt(planEntry, context, env, model, usage, stepTitles, analysis)
					break
				case "design-tokens":
					step = await generateDesignTokensPrompt(planEntry, context, env, model, usage, stepTitles, analysis)
					break
				case "typography":
					step = await generateTypographyPrompt(planEntry, context, env, model, usage, stepTitles, analysis)
					break
				case "layout-shell":
					step = await generateLayoutShellPrompt(planEntry, context, env, model, usage, stepTitles, analysis)
					break
				case "showcase-pages":
					step = await generateShowcasePagesPrompt(planEntry, context, env, model, usage, stepTitles, analysis)
					break
				case "responsive":
					step = await generateResponsivePrompt(planEntry, context, env, model, usage, stepTitles, analysis)
					break
				case "interactions":
					step = await generateInteractionsPrompt(planEntry, context, env, model, usage, stepTitles, analysis)
					break
				default: {
					const message = `Unknown step type: ${planEntry.stepType}, skipping`
					logger.warn(message)
					errors.push({ phase: "prompt-gen", message })
					continue
				}
			}

			steps.push(step)
			logger.info(`Generated prompt for step ${planEntry.stepNumber}: ${planEntry.title}`)
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: `Unknown error generating step ${planEntry.stepNumber}`
			errors.push({ phase: "prompt-gen", message, cause: error })

			if (CRITICAL_STEP_TYPES.has(planEntry.stepType)) {
				logger.error(
					`Critical step failed (${planEntry.stepType}): ${message} — skipping remaining steps`,
				)
				break
			}
			logger.warn(`Failed to generate step ${planEntry.stepNumber}: ${message}`)
		}
	}

	const promptSet: PromptSet = {
		steps,
		readme: "",
		outputDir,
	}

	promptSet.readme = generateReadme(promptSet, env)
	await writePrompts(promptSet)

	phaseSuccess("Phase 4", `Generated ${steps.length} implementation prompts`)

	if (errors.length > 0 && steps.length === 0) {
		return { status: "failed", errors, duration: Date.now() - startTime }
	}
	return {
		status: errors.length > 0 ? "partial" : "completed",
		data: promptSet,
		errors,
		duration: Date.now() - startTime,
	}
}
