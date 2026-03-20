import type { PromptSet, StepType } from "@defs/prompts.js"
import type { EnvironmentProfile } from "./resolve-environment.js"
import { getStepContract } from "./step-contracts.js"

/** Step types in canonical order for contract summary */
const STEP_TYPE_ORDER: StepType[] = [
	"setup",
	"design-tokens",
	"typography",
	"layout-shell",
	"showcase-pages",
	"responsive",
	"interactions",
]

export function generateReadme(promptSet: PromptSet, env: EnvironmentProfile): string {
	const lines: string[] = []

	const titleByStep = new Map<number, string>()
	for (const step of promptSet.steps) {
		titleByStep.set(step.stepNumber, step.title)
	}

	// ── Header ──
	lines.push("# Implementation Prompts")
	lines.push("")
	lines.push(
		`This directory contains ${promptSet.steps.length} step-by-step implementation prompts for a design system. Execute each step file in order.`,
	)
	lines.push("")
	lines.push(buildEnvironmentLine(env))
	lines.push("")

	// ── Steps ──
	lines.push("## Steps")
	lines.push("")
	lines.push("| Step | File | Title | Complexity |")
	lines.push("|------|------|-------|------------|")

	for (const step of promptSet.steps) {
		lines.push(
			`| ${step.stepNumber} | ${step.filename} | ${step.title} | ${step.estimatedComplexity} |`,
		)
	}

	lines.push("")

	// ── Execution Rules ──
	lines.push("## Execution Rules")
	lines.push("")
	lines.push("- Execute steps **sequentially** in the order listed above.")
	lines.push("- Each step file is **self-contained** — all design specs are inlined.")
	lines.push(
		"- Before writing code, **scan the working directory** to find artifacts created by previous steps. Do NOT recreate or duplicate existing work.",
	)
	lines.push(
		"- After completing a step, verify all items in the **Expected Outcome** section exist before proceeding.",
	)
	if (env.mode === "existing-project") {
		lines.push(
			`- This is an **existing ${env.framework} + ${env.styling} project**. Integrate into the existing stack. Do NOT install a different framework or styling library.`,
		)
	}
	lines.push("")

	// ── Prompt Structure ──
	lines.push("## Prompt Structure")
	lines.push("")
	lines.push("Each step file follows this structure:")
	lines.push("")
	lines.push("1. **Goal** — what this step achieves")
	lines.push(
		"2. **Prerequisites** — required prior steps + scan instructions (what to read before writing code)",
	)
	lines.push("3. **Context** — design analysis data to reference")
	lines.push("4. **Instructions** — implementation guidance")
	lines.push("5. **Design Reference** — extracted design specs (colors, spacing, typography, etc.)")
	lines.push("6. **Expected Outcome** — what must exist after completion + artifact checklist")
	lines.push("7. **Validation** — how to verify correctness")
	lines.push("")

	// ── Step Dependencies ──
	lines.push("## Step Dependencies")
	lines.push("")

	for (const step of promptSet.steps) {
		if (step.dependencies.length > 0) {
			const depNames = step.dependencies
				.map((num) => {
					const title = titleByStep.get(num)
					return title ? `Step ${num} (${title})` : `Step ${num}`
				})
				.join(", ")
			lines.push(`- **Step ${step.stepNumber}** (${step.title}) → requires ${depNames}`)
		} else {
			lines.push(`- **Step ${step.stepNumber}** (${step.title}) → no prerequisites`)
		}
	}

	lines.push("")

	// ── Artifact Flow ──
	lines.push("## Artifact Flow")
	lines.push("")
	lines.push(
		"Each step produces artifacts that subsequent steps depend on. Scan the working directory to locate these before starting each step.",
	)
	lines.push("")

	const generatedTypes = new Set(promptSet.steps.map((s) => s.stepType))

	for (const stepType of STEP_TYPE_ORDER.filter((t) => generatedTypes.has(t))) {
		const contract = getStepContract(stepType)
		const stepEntry = promptSet.steps.find((s) => s.stepType === stepType)
		const stepLabel = stepEntry
			? `Step ${stepEntry.stepNumber}: ${formatStepTypeName(stepType)}`
			: formatStepTypeName(stepType)

		lines.push(`### ${stepLabel}`)
		lines.push("")
		if (contract.produces.length > 0) {
			lines.push("**Produces:**")
			for (const artifact of contract.produces) {
				lines.push(`- ${artifact}`)
			}
		}
		if (contract.expects.length > 0) {
			lines.push("")
			lines.push("**Expects:**")
			for (const expectation of contract.expects) {
				lines.push(`- ${expectation}`)
			}
		}
		lines.push("")
	}

	// ── Agent Usage Guide ──
	lines.push(buildAgentGuide())

	return lines.join("\n")
}

function buildAgentGuide(): string {
	return `## Agent Usage Guide

### Recommended Workflow
- **Run each step in a separate agent session** for best results. This prevents context overflow and allows focused execution.
- Steps are designed to be independent — each step scans the project to understand what previous steps created.
- If a step fails, you can re-run just that step without redoing earlier steps.

### Error Recovery
- If a step produces incorrect output, re-run it with additional guidance in the prompt.
- The "Prerequisites" and "Scan Instructions" sections tell the agent exactly what to look for before writing code.
- Each step's "Expected Outcome" section serves as a checklist for verification.

### Tips
- Copy each step's markdown prompt directly into a new AI agent session.
- The agent should read the project's current state before making changes (the scan instructions help with this).
- After each step, verify the "Validation" checklist before proceeding to the next step.
`
}

function buildEnvironmentLine(env: EnvironmentProfile): string {
	if (env.mode === "existing-project") {
		return `**Target:** existing **${env.framework} + ${env.styling}** project. Integrate into the existing stack — do not install a different framework or styling library.`
	}
	return "**Target:** stack-agnostic. No specific framework or styling library is assumed."
}

function formatStepTypeName(stepType: StepType): string {
	const names: Record<StepType, string> = {
		setup: "Setup",
		"design-tokens": "Design Tokens",
		typography: "Typography",
		"layout-shell": "Layout Shell",
		"showcase-pages": "Showcase Pages",
		responsive: "Responsive",
		interactions: "Interactions",
	}
	return names[stepType]
}
