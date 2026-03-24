// ── Shared Principles ────────────────────────────────────────

/** Principles shared across ALL configs (analysis + prompt generation) */
export const SHARED_PRINCIPLES = [
	"Distinguish between intentional design decisions and incidental patterns. Focus on what appears deliberate.",
	"Use concrete values (hex colors, px/rem sizes, token names) rather than vague descriptions.",
	"When confidence is low, say so explicitly. Never fabricate tokens or patterns not present in the code.",
]

/** Additional principles only for source-code analysis (analyzers, doc generators) */
export const ANALYSIS_PRINCIPLES = [
	"Analyze the actual code, not assumptions. Every claim must be backed by evidence from the provided source files.",
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
