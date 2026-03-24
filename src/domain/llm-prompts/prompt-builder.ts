// ── System Prompt Builder ────────────────────────────────────
import {
	SHARED_OUTPUT_RULES_EN,
	SHARED_OUTPUT_RULES_KO,
	SHARED_PRINCIPLES,
} from "./shared-principles.js"

export interface SystemPromptConfig {
	role: string
	task: string
	additionalPrinciples?: string[]
	outputLanguage?: "en" | "ko"
}

export function buildSystemPrompt(config: SystemPromptConfig): string {
	const { role, task, additionalPrinciples = [], outputLanguage = "en" } = config

	const outputRules = outputLanguage === "ko" ? SHARED_OUTPUT_RULES_KO : SHARED_OUTPUT_RULES_EN

	const allPrinciples = [...SHARED_PRINCIPLES, ...additionalPrinciples]

	return `# Role
${role}

# Task
${task}

# Analysis Principles
${allPrinciples.map((p, i) => `${i + 1}. ${p}`).join("\n")}

# Output Rules
${outputRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
}
