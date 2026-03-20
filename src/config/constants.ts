export {
	EXTRACTION_LIMITS,
	IGNORE_PATTERNS,
	INCLUDE_EXTENSIONS,
	TREE_IGNORE_DIRS,
} from "./extraction.js"
export { ANALYSIS, COMPLEXITY_THRESHOLDS } from "./analysis.js"
export { TOKEN_RATIO, CJK_RANGES, CONTEXT_BUDGET, estimateTokens } from "./token-estimation.js"

/** Provider name → environment variable name mapping */
export const PROVIDER_ENV_VARS: Record<string, string> = {
	openai: "OPENAI_API_KEY",
	anthropic: "ANTHROPIC_API_KEY",
	zai: "ZAI_API_KEY",
}
