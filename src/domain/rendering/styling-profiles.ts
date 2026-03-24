export interface StylingProfile {
	id: string
	/** TechStack에서 감지된 styling 문자열 매칭 */
	match: (styling: string) => boolean
	/** 토큰 정의 전략 (프롬프트에 포함) */
	tokenStrategy: string
	/** 컴포넌트 스타일 패턴 설명 */
	componentStylePattern: string
	/** 스타일 파일 확장자: .css, .css.ts, .scss 등 */
	styleExt: string
	/** 스타일링 설정 파일 (tailwind.config.ts 등) */
	configFile: string | null
	/** cn 유틸리티 사용 여부 (Tailwind) */
	usesCn: boolean
}

export const STYLING_PROFILES: StylingProfile[] = [
	{
		id: "tailwind",
		match: (s) => s.includes("tailwind"),
		tokenStrategy:
			"Define tokens in tailwind.config (theme.extend) and use CSS variables for runtime access",
		componentStylePattern: "Utility classes applied directly in component markup",
		styleExt: ".css",
		configFile: "tailwind.config.ts",
		usesCn: true,
	},
	{
		id: "vanilla-extract",
		match: (s) => s.includes("vanilla extract") || s.includes("vanilla-extract"),
		tokenStrategy: "Define tokens using createThemeContract and createTheme",
		componentStylePattern: "Co-located .css.ts files using style() from @vanilla-extract/css",
		styleExt: ".css.ts",
		configFile: null,
		usesCn: false,
	},
	{
		id: "css-modules",
		match: (s) => s.includes("module"),
		tokenStrategy:
			"Define tokens as CSS custom properties in a global stylesheet (:root variables)",
		componentStylePattern:
			"Co-located .module.css files next to each component (e.g., Button.module.css)",
		styleExt: ".module.css",
		configFile: null,
		usesCn: false,
	},
	{
		id: "scss",
		match: (s) => s.includes("scss"),
		tokenStrategy: "SCSS variables and mixins in shared partials",
		componentStylePattern:
			"Co-located .module.scss files next to each component (e.g., Button.module.scss)",
		styleExt: ".module.scss",
		configFile: null,
		usesCn: false,
	},
	{
		id: "styled-components",
		match: (s) => s.includes("styled") || s.includes("emotion"),
		tokenStrategy: "Define tokens as a theme object passed through ThemeProvider",
		componentStylePattern: "Styles defined inline via styled() or css() within each component file",
		styleExt: ".ts",
		configFile: null,
		usesCn: false,
	},
	{
		id: "css",
		match: () => true,
		tokenStrategy:
			"Define tokens as CSS custom properties in a global stylesheet (:root variables)",
		componentStylePattern: "Plain CSS files imported in components",
		styleExt: ".css",
		configFile: null,
		usesCn: false,
	},
]

/** Resolve styling profile from TechStack styling approach string */
export function resolveStylingProfile(styling: string): StylingProfile {
	const lower = styling.toLowerCase()
	return (
		STYLING_PROFILES.find((p) => p.match(lower)) ?? STYLING_PROFILES[STYLING_PROFILES.length - 1]
	)
}
