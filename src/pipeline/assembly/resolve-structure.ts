import type { StepType } from "@defs/prompts.js"
import type { EnvironmentProfile } from "./resolve-environment.js"

/**
 * Conventional project structure resolved from the environment.
 * Provides concrete file paths so generated prompts produce consistent output.
 */
export interface ProjectStructure {
	/** Directory for all style files (e.g., "src/styles") */
	stylesDir: string
	/** Where design tokens are defined (e.g., "src/styles/tokens.css") */
	tokensFile: string
	/** Where global/base styles go (e.g., "src/styles/globals.css") */
	globalsFile: string
	/** Directory for layout components (e.g., "src/components/layout") */
	layoutDir: string
	/** Directory for reusable UI components (e.g., "src/components/ui") */
	uiDir: string
	/** Directory or pattern for page components/routes */
	pagesDir: string
	/** Directory for shared utility functions (e.g., "src/lib/utils") */
	utilsDir: string
	/** Root layout/shell file */
	rootLayout: string
	/** Styling config file if any (e.g., "tailwind.config.ts") */
	stylingConfig: string | null
	/** Component file extension (e.g., ".tsx", ".vue") */
	componentExt: string
	/** Script file extension (e.g., ".ts", ".js") */
	scriptExt: string
	/** Layout component files */
	layoutFiles: LayoutFiles
	/** Page files */
	pageFiles: PageFiles
	/** Utility files */
	utilFiles: UtilFiles
	/** Style files beyond tokens/globals */
	styleFiles: StyleFiles
}

interface LayoutFiles {
	header: string
	footer: string
	navigation: string
	pageContainer: string
}

interface PageFiles {
	home: string
	about: string
}

interface UtilFiles {
	/** className merge utility (e.g., cn() for Tailwind) */
	cn: string
	/** Animation/transition helpers */
	animations: string
}

interface StyleFiles {
	/** Component-level style patterns description */
	componentStylePattern: string
	/** Animation/keyframe definitions */
	animations: string
}

export function resolveProjectStructure(env: EnvironmentProfile): ProjectStructure {
	const framework = env.framework.toLowerCase()
	const styling = env.styling.toLowerCase()

	const componentExt = resolveComponentExt(env)
	const scriptExt = resolveScriptExt(env)
	const stylingConfig = resolveStylingConfig(styling)

	if (framework.includes("next")) {
		return buildNextStructure(env, componentExt, scriptExt, styling, stylingConfig)
	}
	if (framework.includes("nuxt")) {
		return buildNuxtStructure(componentExt, scriptExt, styling, stylingConfig)
	}
	if (framework.includes("vue")) {
		return buildVueStructure(componentExt, scriptExt, styling, stylingConfig)
	}
	if (framework.includes("svelte")) {
		return buildSvelteStructure(scriptExt, styling, stylingConfig)
	}

	return buildReactSpaStructure(componentExt, scriptExt, styling, stylingConfig)
}

function resolveComponentExt(env: EnvironmentProfile): string {
	const lang = env.language.toLowerCase()
	const framework = env.framework.toLowerCase()

	if (framework.includes("vue") || framework.includes("nuxt")) return ".vue"
	if (framework.includes("svelte")) return ".svelte"
	return lang.includes("typescript") ? ".tsx" : ".jsx"
}

function resolveScriptExt(env: EnvironmentProfile): string {
	return env.language.toLowerCase().includes("typescript") ? ".ts" : ".js"
}

function resolveStylingConfig(styling: string): string | null {
	if (styling.includes("tailwind")) return "tailwind.config.ts"
	return null
}

function resolveStyleFiles(stylesDir: string, styling: string): StyleFiles {
	if (styling.includes("module")) {
		return {
			componentStylePattern: `Co-located .module.css files next to each component (e.g., Button.module.css)`,
			animations: `${stylesDir}/animations.css`,
		}
	}
	if (styling.includes("scss")) {
		return {
			componentStylePattern: `Co-located .module.scss files next to each component (e.g., Button.module.scss)`,
			animations: `${stylesDir}/animations.scss`,
		}
	}
	if (styling.includes("styled") || styling.includes("emotion")) {
		return {
			componentStylePattern: `Styles defined inline via styled() or css() within each component file`,
			animations: `${stylesDir}/animations.ts`,
		}
	}
	// Tailwind, plain CSS, or default
	return {
		componentStylePattern: `Utility classes applied directly in component markup`,
		animations: `${stylesDir}/animations.css`,
	}
}

function resolveUtilFiles(utilsDir: string, scriptExt: string, styling: string): UtilFiles {
	return {
		cn: styling.includes("tailwind") ? `${utilsDir}/cn${scriptExt}` : `${utilsDir}/classnames${scriptExt}`,
		animations: `${utilsDir}/animations${scriptExt}`,
	}
}

// ── Framework-specific builders ──

function buildNextStructure(
	env: EnvironmentProfile,
	ext: string,
	scriptExt: string,
	styling: string,
	stylingConfig: string | null,
): ProjectStructure {
	const isAppRouter = !env.framework.toLowerCase().includes("pages")
	const stylesDir = "src/styles"
	const utilsDir = "src/lib/utils"

	const common = {
		stylesDir,
		tokensFile: `${stylesDir}/tokens.css`,
		globalsFile: `${stylesDir}/globals.css`,
		layoutDir: "src/components/layout",
		uiDir: "src/components/ui",
		utilsDir,
		stylingConfig,
		componentExt: ext,
		scriptExt,
		layoutFiles: {
			header: `src/components/layout/Header${ext}`,
			footer: `src/components/layout/Footer${ext}`,
			navigation: `src/components/layout/Navigation${ext}`,
			pageContainer: `src/components/layout/PageContainer${ext}`,
		},
		utilFiles: resolveUtilFiles(utilsDir, scriptExt, styling),
		styleFiles: resolveStyleFiles(stylesDir, styling),
	}

	if (isAppRouter) {
		return {
			...common,
			pagesDir: "src/app",
			rootLayout: `src/app/layout${ext}`,
			pageFiles: {
				home: `src/app/page${ext}`,
				about: `src/app/about/page${ext}`,
			},
		}
	}

	return {
		...common,
		pagesDir: "src/pages",
		rootLayout: `src/pages/_app${ext}`,
		pageFiles: {
			home: `src/pages/index${ext}`,
			about: `src/pages/about${ext}`,
		},
	}
}

function buildNuxtStructure(
	ext: string,
	scriptExt: string,
	styling: string,
	stylingConfig: string | null,
): ProjectStructure {
	const stylesDir = "assets/css"
	const utilsDir = "utils"
	return {
		stylesDir,
		tokensFile: `${stylesDir}/tokens.css`,
		globalsFile: `${stylesDir}/globals.css`,
		layoutDir: "components/layout",
		uiDir: "components/ui",
		pagesDir: "pages",
		utilsDir,
		rootLayout: `layouts/default${ext}`,
		stylingConfig,
		componentExt: ext,
		scriptExt,
		layoutFiles: {
			header: `components/layout/Header${ext}`,
			footer: `components/layout/Footer${ext}`,
			navigation: `components/layout/Navigation${ext}`,
			pageContainer: `components/layout/PageContainer${ext}`,
		},
		pageFiles: {
			home: `pages/index${ext}`,
			about: `pages/about${ext}`,
		},
		utilFiles: resolveUtilFiles(utilsDir, scriptExt, styling),
		styleFiles: resolveStyleFiles(stylesDir, styling),
	}
}

function buildVueStructure(
	ext: string,
	scriptExt: string,
	styling: string,
	stylingConfig: string | null,
): ProjectStructure {
	const stylesDir = "src/assets/styles"
	const utilsDir = "src/utils"
	return {
		stylesDir,
		tokensFile: `${stylesDir}/tokens.css`,
		globalsFile: `${stylesDir}/globals.css`,
		layoutDir: "src/components/layout",
		uiDir: "src/components/ui",
		pagesDir: "src/views",
		utilsDir,
		rootLayout: `src/App${ext}`,
		stylingConfig,
		componentExt: ext,
		scriptExt,
		layoutFiles: {
			header: `src/components/layout/Header${ext}`,
			footer: `src/components/layout/Footer${ext}`,
			navigation: `src/components/layout/Navigation${ext}`,
			pageContainer: `src/components/layout/PageContainer${ext}`,
		},
		pageFiles: {
			home: `src/views/Home${ext}`,
			about: `src/views/About${ext}`,
		},
		utilFiles: resolveUtilFiles(utilsDir, scriptExt, styling),
		styleFiles: resolveStyleFiles(stylesDir, styling),
	}
}

function buildSvelteStructure(
	scriptExt: string,
	styling: string,
	stylingConfig: string | null,
): ProjectStructure {
	const ext = ".svelte"
	const stylesDir = "src/styles"
	const utilsDir = "src/lib/utils"
	return {
		stylesDir,
		tokensFile: `${stylesDir}/tokens.css`,
		globalsFile: `${stylesDir}/globals.css`,
		layoutDir: "src/lib/components/layout",
		uiDir: "src/lib/components/ui",
		pagesDir: "src/routes",
		utilsDir,
		rootLayout: "src/routes/+layout.svelte",
		stylingConfig,
		componentExt: ext,
		scriptExt,
		layoutFiles: {
			header: `src/lib/components/layout/Header${ext}`,
			footer: `src/lib/components/layout/Footer${ext}`,
			navigation: `src/lib/components/layout/Navigation${ext}`,
			pageContainer: `src/lib/components/layout/PageContainer${ext}`,
		},
		pageFiles: {
			home: "src/routes/+page.svelte",
			about: "src/routes/about/+page.svelte",
		},
		utilFiles: resolveUtilFiles(utilsDir, scriptExt, styling),
		styleFiles: resolveStyleFiles(stylesDir, styling),
	}
}

function buildReactSpaStructure(
	ext: string,
	scriptExt: string,
	styling: string,
	stylingConfig: string | null,
): ProjectStructure {
	const stylesDir = "src/styles"
	const utilsDir = "src/utils"
	return {
		stylesDir,
		tokensFile: `${stylesDir}/tokens.css`,
		globalsFile: `${stylesDir}/globals.css`,
		layoutDir: "src/components/layout",
		uiDir: "src/components/ui",
		pagesDir: "src/pages",
		utilsDir,
		rootLayout: `src/App${ext}`,
		stylingConfig,
		componentExt: ext,
		scriptExt,
		layoutFiles: {
			header: `src/components/layout/Header${ext}`,
			footer: `src/components/layout/Footer${ext}`,
			navigation: `src/components/layout/Navigation${ext}`,
			pageContainer: `src/components/layout/PageContainer${ext}`,
		},
		pageFiles: {
			home: `src/pages/Home${ext}`,
			about: `src/pages/About${ext}`,
		},
		utilFiles: resolveUtilFiles(utilsDir, scriptExt, styling),
		styleFiles: resolveStyleFiles(stylesDir, styling),
	}
}

// ── File structure guide builders ──

/**
 * Builds a file structure guide section for a specific step type.
 * Injected into the prompt text sent to the LLM so it generates
 * instructions with concrete, conventional file paths.
 */
export function buildFileStructureGuide(
	stepType: StepType,
	structure: ProjectStructure,
): string {
	const lines: string[] = []
	lines.push("## File Structure")
	lines.push("")
	lines.push("Use the following file paths. Do NOT deviate from this structure:")
	lines.push("")

	switch (stepType) {
		case "setup":
			lines.push("```")
			if (structure.stylingConfig) {
				lines.push(`${structure.stylingConfig}              # styling/token configuration`)
			}
			lines.push(`${structure.stylesDir}/`)
			lines.push(`  ${basename(structure.tokensFile)}                    # design token definitions`)
			lines.push(`  ${basename(structure.globalsFile)}                   # global base styles (reset, body defaults)`)
			lines.push(`${structure.layoutDir}/                    # layout components (created in later steps)`)
			lines.push(`${structure.uiDir}/                        # UI components (created in later steps)`)
			lines.push(`${structure.utilsDir}/`)
			lines.push(`  ${basename(structure.utilFiles.cn)}                       # className merge utility`)
			lines.push("```")
			break

		case "design-tokens":
			lines.push("```")
			lines.push(`${structure.tokensFile}                    # all token definitions go here`)
			if (structure.stylingConfig) {
				lines.push(`${structure.stylingConfig}              # extend theme with token values`)
			}
			lines.push("```")
			break

		case "typography":
			lines.push("```")
			lines.push(`${structure.tokensFile}                    # add typography tokens (extend existing)`)
			if (structure.stylingConfig) {
				lines.push(`${structure.stylingConfig}              # extend theme with typography values`)
			}
			lines.push("```")
			break

		case "layout-shell":
			lines.push("```")
			lines.push(`${structure.rootLayout}                    # root layout / app shell`)
			lines.push(`${structure.layoutDir}/`)
			lines.push(`  ${basename(structure.layoutFiles.header)}                  # site header`)
			lines.push(`  ${basename(structure.layoutFiles.footer)}                  # site footer`)
			lines.push(`  ${basename(structure.layoutFiles.navigation)}              # navigation component`)
			lines.push(`  ${basename(structure.layoutFiles.pageContainer)}           # page container (max-width, padding)`)
			lines.push("```")
			break

		case "showcase-pages":
			lines.push("```")
			lines.push(`${structure.pageFiles.home}                # home showcase page`)
			lines.push(`${structure.pageFiles.about}               # about showcase page`)
			lines.push(`${structure.uiDir}/`)
			lines.push(`  Button${structure.componentExt}                      # button component`)
			lines.push(`  Card${structure.componentExt}                        # card component`)
			lines.push(`  Section${structure.componentExt}                     # section container component`)
			lines.push("```")
			lines.push("")
			lines.push(`**Component styling**: ${structure.styleFiles.componentStylePattern}`)
			lines.push("")
			lines.push("Create small, focused UI components in the `ui/` directory as needed.")
			lines.push("Each component: one file, PascalCase name, single responsibility.")
			break

		case "responsive":
			lines.push("Modify existing files. Only create new files if a responsive utility is needed:")
			lines.push("")
			lines.push("```")
			lines.push(`${structure.rootLayout}                    # responsive shell adjustments`)
			lines.push(`${structure.layoutFiles.header}            # responsive header / mobile nav`)
			lines.push(`${structure.layoutFiles.navigation}        # responsive navigation behavior`)
			lines.push(`${structure.pageFiles.home}                # responsive home page`)
			lines.push(`${structure.pageFiles.about}               # responsive about page`)
			lines.push("```")
			break

		case "interactions":
			lines.push("Modify existing files. Create utility files for shared animation logic if needed:")
			lines.push("")
			lines.push("```")
			lines.push(`${structure.pageFiles.home}                # page transitions, scroll effects`)
			lines.push(`${structure.pageFiles.about}               # page transitions`)
			lines.push(`${structure.uiDir}/Button${structure.componentExt}             # hover/active/focus states`)
			lines.push(`${structure.uiDir}/Card${structure.componentExt}               # hover effects`)
			lines.push(`${structure.styleFiles.animations}         # shared keyframes / animation definitions`)
			lines.push(`${structure.utilFiles.animations}           # animation utility functions (optional)`)
			lines.push("```")
			break
	}

	lines.push("")
	return lines.join("\n")
}

function basename(filePath: string): string {
	return filePath.split("/").pop() ?? filePath
}
