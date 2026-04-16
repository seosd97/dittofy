export interface StylingProfile {
	id: string
	/** Match against the styling string detected from TechStack */
	match: (styling: string) => boolean
	/** Token definition strategy (included in prompt) */
	tokenStrategy: string
	/** Component style pattern description */
	componentStylePattern: string
	/** Style file extension: .css, .css.ts, .scss, etc. */
	styleExt: string
	/** Styling config file (e.g., tailwind.config.ts) */
	configFile: string | null
	/** Whether the cn utility is used (Tailwind) */
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
