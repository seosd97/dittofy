import type { StepType } from "@defs/prompts.js"
import { type StylingProfile, resolveStylingProfile } from "./styling-profiles.js"

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

export function resolveProjectStructure(opts: {
	framework: string
	language: string
	styling: string
}): ProjectStructure {
	const framework = opts.framework.toLowerCase()
	const styling = opts.styling.toLowerCase()
	const profile = resolveStylingProfile(styling)

	const componentExt = resolveComponentExt(framework, opts.language)
	const scriptExt = resolveScriptExt(opts.language)

	if (framework.includes("next")) {
		return buildNextStructure(componentExt, scriptExt, profile, framework)
	}
	if (framework.includes("nuxt")) {
		return buildNuxtStructure(componentExt, scriptExt, profile)
	}
	if (framework.includes("vue")) {
		return buildVueStructure(componentExt, scriptExt, profile)
	}
	if (framework.includes("svelte")) {
		return buildSvelteStructure(scriptExt, profile)
	}

	return buildReactSpaStructure(componentExt, scriptExt, profile)
}

function resolveComponentExt(framework: string, language: string): string {
	const fw = framework.toLowerCase()
	const lang = language.toLowerCase()

	if (fw.includes("vue") || fw.includes("nuxt")) return ".vue"
	if (fw.includes("svelte")) return ".svelte"
	return lang.includes("typescript") ? ".tsx" : ".jsx"
}

function resolveScriptExt(language: string): string {
	return language.toLowerCase().includes("typescript") ? ".ts" : ".js"
}

function resolveStyleFiles(stylesDir: string, profile: StylingProfile): StyleFiles {
	return {
		componentStylePattern: profile.componentStylePattern,
		animations: `${stylesDir}/animations${profile.styleExt}`,
	}
}

function resolveUtilFiles(utilsDir: string, scriptExt: string, profile: StylingProfile): UtilFiles {
	return {
		cn: profile.usesCn ? `${utilsDir}/cn${scriptExt}` : `${utilsDir}/classnames${scriptExt}`,
		animations: `${utilsDir}/animations${scriptExt}`,
	}
}

function resolveTokensFile(stylesDir: string, profile: StylingProfile): string {
	return `${stylesDir}/tokens${profile.styleExt}`
}

function resolveGlobalsFile(stylesDir: string, profile: StylingProfile): string {
	return `${stylesDir}/globals${profile.styleExt}`
}

// ── Framework-specific builders ──

function buildNextStructure(
	ext: string,
	scriptExt: string,
	profile: StylingProfile,
	framework: string,
): ProjectStructure {
	const isAppRouter = !framework.toLowerCase().includes("pages")
	const stylesDir = "src/styles"
	const utilsDir = "src/lib/utils"

	const common = {
		stylesDir,
		tokensFile: resolveTokensFile(stylesDir, profile),
		globalsFile: resolveGlobalsFile(stylesDir, profile),
		layoutDir: "src/components/layout",
		uiDir: "src/components/ui",
		utilsDir,
		stylingConfig: profile.configFile,
		componentExt: ext,
		scriptExt,
		layoutFiles: {
			header: `src/components/layout/Header${ext}`,
			footer: `src/components/layout/Footer${ext}`,
			navigation: `src/components/layout/Navigation${ext}`,
			pageContainer: `src/components/layout/PageContainer${ext}`,
		},
		utilFiles: resolveUtilFiles(utilsDir, scriptExt, profile),
		styleFiles: resolveStyleFiles(stylesDir, profile),
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
	profile: StylingProfile,
): ProjectStructure {
	const stylesDir = "assets/css"
	const utilsDir = "utils"
	return {
		stylesDir,
		tokensFile: resolveTokensFile(stylesDir, profile),
		globalsFile: resolveGlobalsFile(stylesDir, profile),
		layoutDir: "components/layout",
		uiDir: "components/ui",
		pagesDir: "pages",
		utilsDir,
		rootLayout: `layouts/default${ext}`,
		stylingConfig: profile.configFile,
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
		utilFiles: resolveUtilFiles(utilsDir, scriptExt, profile),
		styleFiles: resolveStyleFiles(stylesDir, profile),
	}
}

function buildVueStructure(
	ext: string,
	scriptExt: string,
	profile: StylingProfile,
): ProjectStructure {
	const stylesDir = "src/assets/styles"
	const utilsDir = "src/utils"
	return {
		stylesDir,
		tokensFile: resolveTokensFile(stylesDir, profile),
		globalsFile: resolveGlobalsFile(stylesDir, profile),
		layoutDir: "src/components/layout",
		uiDir: "src/components/ui",
		pagesDir: "src/views",
		utilsDir,
		rootLayout: `src/App${ext}`,
		stylingConfig: profile.configFile,
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
		utilFiles: resolveUtilFiles(utilsDir, scriptExt, profile),
		styleFiles: resolveStyleFiles(stylesDir, profile),
	}
}

function buildSvelteStructure(scriptExt: string, profile: StylingProfile): ProjectStructure {
	const ext = ".svelte"
	const stylesDir = "src/styles"
	const utilsDir = "src/lib/utils"
	return {
		stylesDir,
		tokensFile: resolveTokensFile(stylesDir, profile),
		globalsFile: resolveGlobalsFile(stylesDir, profile),
		layoutDir: "src/lib/components/layout",
		uiDir: "src/lib/components/ui",
		pagesDir: "src/routes",
		utilsDir,
		rootLayout: "src/routes/+layout.svelte",
		stylingConfig: profile.configFile,
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
		utilFiles: resolveUtilFiles(utilsDir, scriptExt, profile),
		styleFiles: resolveStyleFiles(stylesDir, profile),
	}
}

function buildReactSpaStructure(
	ext: string,
	scriptExt: string,
	profile: StylingProfile,
): ProjectStructure {
	const stylesDir = "src/styles"
	const utilsDir = "src/utils"
	return {
		stylesDir,
		tokensFile: resolveTokensFile(stylesDir, profile),
		globalsFile: resolveGlobalsFile(stylesDir, profile),
		layoutDir: "src/components/layout",
		uiDir: "src/components/ui",
		pagesDir: "src/pages",
		utilsDir,
		rootLayout: `src/App${ext}`,
		stylingConfig: profile.configFile,
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
		utilFiles: resolveUtilFiles(utilsDir, scriptExt, profile),
		styleFiles: resolveStyleFiles(stylesDir, profile),
	}
}

// ── File structure guide builders ──

function buildSetupGuide(s: ProjectStructure): string[] {
	const lines: string[] = []
	lines.push(`${s.stylingConfig}              # styling/token configuration`)
	lines.push(`${s.stylesDir}/`)
	lines.push(`  ${basename(s.tokensFile)}                    # design token definitions`)
	lines.push(
		`  ${basename(s.globalsFile)}                   # global base styles (reset, body defaults)`,
	)
	lines.push(`${s.layoutDir}/                    # layout components (created in later steps)`)
	lines.push(`${s.uiDir}/                        # UI components (created in later steps)`)
	lines.push(`${s.utilsDir}/`)
	lines.push(`  ${basename(s.utilFiles.cn)}                       # className merge utility`)
	return lines
}

function buildDesignTokensGuide(s: ProjectStructure): string[] {
	const lines: string[] = [`${s.tokensFile}                    # all token definitions go here`]
	if (s.stylingConfig) {
		lines.push(`${s.stylingConfig}              # extend theme with token values`)
	}
	return lines
}

function buildTypographyGuide(s: ProjectStructure): string[] {
	const lines: string[] = [
		`${s.tokensFile}                    # add typography tokens (extend existing)`,
	]
	if (s.stylingConfig) {
		lines.push(`${s.stylingConfig}              # extend theme with typography values`)
	}
	return lines
}

function buildLayoutShellGuide(s: ProjectStructure): string[] {
	return [
		`${s.rootLayout}                    # root layout / app shell`,
		`${s.layoutDir}/`,
		`  ${basename(s.layoutFiles.header)}                  # site header`,
		`  ${basename(s.layoutFiles.footer)}                  # site footer`,
		`  ${basename(s.layoutFiles.navigation)}              # navigation component`,
		`  ${basename(s.layoutFiles.pageContainer)}           # page container (max-width, padding)`,
	]
}

function buildShowcasePagesGuide(s: ProjectStructure): string[] {
	return [
		`${s.pageFiles.home}                # home showcase page`,
		`${s.pageFiles.about}               # about showcase page`,
		`${s.uiDir}/`,
		`  Button${s.componentExt}                      # button component`,
		`  Card${s.componentExt}                        # card component`,
		`  Section${s.componentExt}                     # section container component`,
	]
}

function buildResponsiveGuide(s: ProjectStructure): string[] {
	return [
		`${s.rootLayout}                    # responsive shell adjustments`,
		`${s.layoutFiles.header}            # responsive header / mobile nav`,
		`${s.layoutFiles.navigation}        # responsive navigation behavior`,
		`${s.pageFiles.home}                # responsive home page`,
		`${s.pageFiles.about}               # responsive about page`,
	]
}

function buildInteractionsGuide(s: ProjectStructure): string[] {
	return [
		`${s.pageFiles.home}                # page transitions, scroll effects`,
		`${s.pageFiles.about}               # page transitions`,
		`${s.uiDir}/Button${s.componentExt}             # hover/active/focus states`,
		`${s.uiDir}/Card${s.componentExt}               # hover effects`,
		`${s.styleFiles.animations}         # shared keyframes / animation definitions`,
		`${s.utilFiles.animations}           # animation utility functions (optional)`,
	]
}

const stepBuilders: Record<StepType, (s: ProjectStructure) => string[]> = {
	setup: buildSetupGuide,
	"design-tokens": buildDesignTokensGuide,
	typography: buildTypographyGuide,
	"layout-shell": buildLayoutShellGuide,
	"showcase-pages": buildShowcasePagesGuide,
	responsive: buildResponsiveGuide,
	interactions: buildInteractionsGuide,
}

/**
 * Builds a file structure guide section for a specific step type.
 * Injected into the prompt text sent to the LLM so it generates
 * instructions with concrete, conventional file paths.
 */
export function buildFileStructureGuide(stepType: StepType, structure: ProjectStructure): string {
	const lines: string[] = []
	lines.push("## File Structure")
	lines.push("")
	lines.push("Use the following file paths. Do NOT deviate from this structure:")
	lines.push("")

	const builder = stepBuilders[stepType]
	if (!builder) {
		lines.push("```")
		lines.push("# (no structure guide for this step)")
		lines.push("```")
		lines.push("")
		return lines.join("\n")
	}

	// Special cases with non-code-block content
	if (stepType === "responsive") {
		lines.push("Modify existing files. Only create new files if a responsive utility is needed:")
	} else if (stepType === "interactions") {
		lines.push("Modify existing files. Create utility files for shared animation logic if needed:")
	} else {
		lines.push("```")
	}

	lines.push(...builder(structure))

	if (stepType !== "responsive" && stepType !== "interactions") {
		lines.push("```")
	}

	if (stepType === "showcase-pages") {
		lines.push("")
		lines.push(`**Component styling**: ${structure.styleFiles.componentStylePattern}`)
		lines.push("")
		lines.push("Create small, focused UI components in the `ui/` directory as needed.")
		lines.push("Each component: one file, PascalCase name, single responsibility.")
	}

	lines.push("")
	return lines.join("\n")
}

function basename(filePath: string): string {
	return filePath.split("/").pop() ?? filePath
}
