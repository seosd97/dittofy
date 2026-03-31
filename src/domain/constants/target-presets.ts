export interface TargetPreset {
	id: string
	framework: string
	language: string
	styling: string
	buildTool: string | null
	uiLibrary: string | null
}

/** Task preset names used for LLM call configuration */
export const TASK_PRESET_NAMES = [
	"tokenAnalyzer",
	"typographyAnalyzer",
	"componentAnalyzer",
	"componentChunkAnalyzer",
	"layoutAnalyzer",
	"pageAnalyzer",
	"responsiveAnalyzer",
	"interactionAnalyzer",
	"essenceSynthesizer",
	"analysisPlanner",
] as const

export type PresetName = (typeof TASK_PRESET_NAMES)[number]

export const TARGET_PRESETS: Record<string, TargetPreset> = {
	"next-tailwind": {
		id: "next-tailwind",
		framework: "Next.js",
		language: "TypeScript",
		styling: "Tailwind CSS",
		buildTool: "Next.js built-in",
		uiLibrary: null,
	},
	"react-css-modules": {
		id: "react-css-modules",
		framework: "React",
		language: "TypeScript",
		styling: "CSS Modules",
		buildTool: "Vite",
		uiLibrary: null,
	},
	"vue-css": {
		id: "vue-css",
		framework: "Vue",
		language: "TypeScript",
		styling: "Scoped CSS",
		buildTool: "Vite",
		uiLibrary: null,
	},
	"svelte-tailwind": {
		id: "svelte-tailwind",
		framework: "Svelte",
		language: "TypeScript",
		styling: "Tailwind CSS",
		buildTool: "Vite",
		uiLibrary: null,
	},
}

export function getTargetPreset(target: string): TargetPreset | undefined {
	return TARGET_PRESETS[target]
}

export function listTargetPresets(): string[] {
	return Object.keys(TARGET_PRESETS)
}
