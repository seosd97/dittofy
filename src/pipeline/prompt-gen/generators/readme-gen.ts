import type { PromptSet } from "@defs/prompts.js"

export function generateReadme(promptSet: PromptSet): string {
	const lines: string[] = []

	lines.push("# Implementation Prompts")
	lines.push("")
	lines.push("This directory contains step-by-step implementation prompts for an AI coding agent.")
	lines.push("Each step is self-contained with all necessary design specifications inline.")
	lines.push("")
	lines.push("## Steps")
	lines.push("")
	lines.push("| Step | File | Title | Complexity |")
	lines.push("|------|------|-------|------------|")

	for (const step of promptSet.steps) {
		lines.push(
			`| ${step.stepNumber} | [${step.filename}](./${step.filename}) | ${step.title} | ${step.estimatedComplexity} |`,
		)
	}

	lines.push("")
	lines.push("## Usage")
	lines.push("")
	lines.push("Feed each prompt to an AI coding agent in order.")
	lines.push("Each step lists its prerequisites — ensure they are completed before proceeding.")
	lines.push("")
	lines.push("## Step Dependencies")
	lines.push("")

	for (const step of promptSet.steps) {
		if (step.prerequisites.length > 0) {
			lines.push(
				`- **Step ${step.stepNumber}** (${step.title}): requires ${step.prerequisites.join(", ")}`,
			)
		} else {
			lines.push(`- **Step ${step.stepNumber}** (${step.title}): no prerequisites`)
		}
	}

	lines.push("")

	return lines.join("\n")
}
