import type { LanguageModel } from "ai"
import type { UsageTracker } from "../../llm/usage.js"
import type { AnalysisResult } from "../../types/analysis.js"
import type { DocumentSet } from "../../types/documentation.js"
import type { PhaseError, PhaseResult } from "../../types/pipeline.js"
import type { PromptSet, PromptStep } from "../../types/prompts.js"
import { logger, phaseStart, phaseSuccess } from "../../utils/logger.js"
import { injectContext } from "./context-injector.js"
import { generateComponentsPrompt } from "./generators/components-prompt.js"
import { generateDesignSystemPrompt } from "./generators/design-system-prompt.js"
import { generateInteractionsPrompt } from "./generators/interactions-prompt.js"
import { generatePagesPrompt } from "./generators/pages-prompt.js"
import { generateReadme } from "./generators/readme-gen.js"
import { generateResponsivePrompt } from "./generators/responsive-prompt.js"
import { generateSetupPrompt } from "./generators/setup-prompt.js"
import { planSteps } from "./step-planner.js"
import { writePrompts } from "./writer.js"

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

	// 1. Plan steps
	const stepPlan = planSteps(analysis)
	logger.info(`Planned ${stepPlan.totalSteps} implementation steps`)

	// 2. Generate prompts for each step
	const steps: PromptStep[] = []

	for (const planEntry of stepPlan.steps) {
		const context = injectContext(planEntry, analysis, documents)

		try {
			let step: PromptStep

			switch (planEntry.stepType) {
				case "setup":
					step = await generateSetupPrompt(analysis, context, model, usage)
					break
				case "design-system":
					step = await generateDesignSystemPrompt(analysis, context, model, usage)
					break
				case "components":
					step = await generateComponentsPrompt(planEntry, context, model, usage)
					break
				case "pages":
					step = await generatePagesPrompt(planEntry, context, model, usage)
					break
				case "responsive":
					step = await generateResponsivePrompt(planEntry, context, model, usage)
					break
				case "interactions":
					step = await generateInteractionsPrompt(planEntry, context, model, usage)
					break
				default:
					step = await generateComponentsPrompt(planEntry, context, model, usage)
					break
			}

			steps.push(step)
			logger.info(`Generated prompt for step ${planEntry.stepNumber}: ${planEntry.title}`)
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: `Unknown error generating step ${planEntry.stepNumber}`
			errors.push({ phase: "prompt-gen", message, cause: error })

			const isCritical = planEntry.stepType === "setup" || planEntry.stepType === "design-system"
			if (isCritical) {
				logger.error(
					`Critical step failed (${planEntry.stepType}): ${message} — skipping remaining steps`,
				)
				break
			}
			logger.warn(`Failed to generate step ${planEntry.stepNumber}: ${message}`)
		}
	}

	// 3. Build prompt set
	const promptSet: PromptSet = {
		steps,
		readme: "",
		outputDir,
	}

	// 4. Generate README
	promptSet.readme = generateReadme(promptSet)

	// 5. Write all prompts
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
