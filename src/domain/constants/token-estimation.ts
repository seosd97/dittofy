/** Token estimation ratios (chars per token) */
export const TOKEN_RATIO = {
	/** ~4 ASCII chars per token */
	asciiCharsPerToken: 4,
	/** ~1.5 tokens per CJK char */
	cjkTokensPerChar: 1.5,
} as const

/** CJK Unicode ranges for token estimation */
export const CJK_RANGES: readonly [number, number][] = [
	[0x4e00, 0x9fff], // CJK Unified Ideographs
	[0xac00, 0xd7af], // Hangul Syllables
	[0x3040, 0x30ff], // Hiragana / Katakana
	[0x3400, 0x4dbf], // CJK Extension A
	[0xf900, 0xfaff], // CJK Compatibility Ideographs
]

/** Context token budget allocation */
export const CONTEXT_BUDGET = {
	defaultTokenBudget: 30_000,
	maxFilesPerAnalyzer: 50,
	maxSummaryTokens: 8_000,
} as const

/** Estimate token count for a given text, accounting for CJK characters */
export function estimateTokens(text: string): number {
	let asciiLen = 0
	let cjkCount = 0
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i)
		if (CJK_RANGES.some(([start, end]) => code >= start && code <= end)) {
			cjkCount++
		} else {
			asciiLen++
		}
	}
	return Math.ceil(
		asciiLen / TOKEN_RATIO.asciiCharsPerToken + cjkCount * TOKEN_RATIO.cjkTokensPerChar,
	)
}
