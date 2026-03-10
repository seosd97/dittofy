export const SHARED_PRINCIPLES = [
	"Analyze the actual code, not assumptions. Every claim must be backed by evidence from the provided source files.",
	"Distinguish between intentional design decisions and incidental patterns. Focus on what appears deliberate.",
	"Use concrete values (hex colors, px/rem sizes, specific class names) rather than vague descriptions.",
	"When confidence is low, say so explicitly. Never fabricate tokens or patterns not present in the code.",
	"Consider the styling tier: Tailwind CSS (tier 1) has explicit tokens; CSS-in-JS (tier 3) requires more inference.",
]

export const SHARED_OUTPUT_RULES_EN = [
	"Output language: English",
	"Use specific, measurable values. Avoid 'appropriate', 'natural', 'clean' without qualification.",
	"Include confidence level for every analysis item.",
]

export const SHARED_OUTPUT_RULES_KO = [
	"Output language: Korean (한국어)",
	"Use specific, measurable values. Avoid vague terms.",
	"Include confidence level for every analysis item.",
]

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
