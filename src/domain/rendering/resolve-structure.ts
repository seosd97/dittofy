import type { StepType } from "@defs/prompts.js"
import { type StylingProfile, resolveStylingProfile } from "./styling-profiles.js"

export interface ProjectStructure {
	stylesDir: string
	tokensFile: string
	globalsFile: string
	layoutDir: string
	uiDir: string
	pagesDir: string
	utilsDir: string
	rootLayout: string
	stylingConfig: string | null
	componentExt: string
	scriptExt: string
	layoutFiles: LayoutFiles
	pageFiles: PageFiles
	utilFiles: UtilFiles
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
	cn: string
	animations: string
}

interface StyleFiles {
	componentStylePattern: string
	animations: string
}

// ── Framework Path Config ────────────────────────────────────────

interface FrameworkPaths {
	stylesDir: string
	layoutDir: string
	uiDir: string
	pagesDir: string
	utilsDir: string
	rootLayout: (ext: string) => string
	pageHome: (ext: string) => string
	pageAbout: (ext: string) => string
}

const FRAMEWORK_CONFIGS: Record<string, FrameworkPaths> = {
	nextApp: {
		stylesDir: "src/styles",
		layoutDir: "src/components/layout",
		uiDir: "src/components/ui",
		pagesDir: "src/app",
		utilsDir: "src/lib/utils",
		rootLayout: (ext) => `src/app/layout${ext}`,
		pageHome: (ext) => `src/app/page${ext}`,
		pageAbout: (ext) => `src/app/about/page${ext}`,
	},
	nextPages: {
		stylesDir: "src/styles",
		layoutDir: "src/components/layout",
		uiDir: "src/components/ui",
		pagesDir: "src/pages",
		utilsDir: "src/lib/utils",
		rootLayout: (ext) => `src/pages/_app${ext}`,
		pageHome: (ext) => `src/pages/index${ext}`,
		pageAbout: (ext) => `src/pages/about${ext}`,
	},
	nuxt: {
		stylesDir: "assets/css",
		layoutDir: "components/layout",
		uiDir: "components/ui",
		pagesDir: "pages",
		utilsDir: "utils",
		rootLayout: (ext) => `layouts/default${ext}`,
		pageHome: (ext) => `pages/index${ext}`,
		pageAbout: (ext) => `pages/about${ext}`,
	},
	vue: {
		stylesDir: "src/assets/styles",
		layoutDir: "src/components/layout",
		uiDir: "src/components/ui",
		pagesDir: "src/views",
		utilsDir: "src/utils",
		rootLayout: (ext) => `src/App${ext}`,
		pageHome: (ext) => `src/views/Home${ext}`,
		pageAbout: (ext) => `src/views/About${ext}`,
	},
	svelte: {
		stylesDir: "src/styles",
		layoutDir: "src/lib/components/layout",
		uiDir: "src/lib/components/ui",
		pagesDir: "src/routes",
		utilsDir: "src/lib/utils",
		rootLayout: () => "src/routes/+layout.svelte",
		pageHome: () => "src/routes/+page.svelte",
		pageAbout: () => "src/routes/about/+page.svelte",
	},
	reactSpa: {
		stylesDir: "src/styles",
		layoutDir: "src/components/layout",
		uiDir: "src/components/ui",
		pagesDir: "src/pages",
		utilsDir: "src/utils",
		rootLayout: (ext) => `src/App${ext}`,
		pageHome: (ext) => `src/pages/Home${ext}`,
		pageAbout: (ext) => `src/pages/About${ext}`,
	},
}

function resolveFrameworkKey(framework: string): { key: string; recognized: boolean } {
	const fw = framework.toLowerCase()
	if (fw.includes("next")) {
		return { key: fw.includes("pages") ? "nextPages" : "nextApp", recognized: true }
	}
	if (fw.includes("nuxt")) return { key: "nuxt", recognized: true }
	if (fw.includes("vue")) return { key: "vue", recognized: true }
	if (fw.includes("svelte")) return { key: "svelte", recognized: true }
	if (fw.includes("react")) return { key: "reactSpa", recognized: true }
	return { key: "reactSpa", recognized: false }
}

// ── Public API ──────────────────────────────────────────────────

export function resolveProjectStructure(opts: {
	framework: string
	language: string
	styling: string
	log?: { warn?: (msg: string) => void }
}): ProjectStructure {
	const framework = opts.framework.toLowerCase()
	const profile = resolveStylingProfile(opts.styling.toLowerCase())

	const componentExt = resolveComponentExt(framework, opts.language)
	const scriptExt = resolveScriptExt(opts.language)

	const { key, recognized } = resolveFrameworkKey(framework)
	if (!recognized) {
		opts.log?.warn?.(
			`Unrecognized framework "${opts.framework}" — defaulting to React SPA structure`,
		)
	}
	const cfg = FRAMEWORK_CONFIGS[key]

	return buildStructure(cfg, componentExt, scriptExt, profile)
}

// ── Structure Builder ───────────────────────────────────────────

function buildStructure(
	cfg: FrameworkPaths,
	componentExt: string,
	scriptExt: string,
	profile: StylingProfile,
): ProjectStructure {
	const ext = componentExt

	return {
		stylesDir: cfg.stylesDir,
		tokensFile: `${cfg.stylesDir}/tokens${profile.styleExt}`,
		globalsFile: `${cfg.stylesDir}/globals${profile.styleExt}`,
		layoutDir: cfg.layoutDir,
		uiDir: cfg.uiDir,
		pagesDir: cfg.pagesDir,
		utilsDir: cfg.utilsDir,
		rootLayout: cfg.rootLayout(ext),
		stylingConfig: profile.configFile,
		componentExt: ext,
		scriptExt,
		layoutFiles: {
			header: `${cfg.layoutDir}/Header${ext}`,
			footer: `${cfg.layoutDir}/Footer${ext}`,
			navigation: `${cfg.layoutDir}/Navigation${ext}`,
			pageContainer: `${cfg.layoutDir}/PageContainer${ext}`,
		},
		pageFiles: {
			home: cfg.pageHome(ext),
			about: cfg.pageAbout(ext),
		},
		utilFiles: resolveUtilFiles(cfg.utilsDir, scriptExt, profile),
		styleFiles: resolveStyleFiles(cfg.stylesDir, profile),
	}
}

// ── Extension Resolvers ─────────────────────────────────────────

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

// ── File Resolvers ──────────────────────────────────────────────

function resolveUtilFiles(utilsDir: string, scriptExt: string, profile: StylingProfile): UtilFiles {
	return {
		cn: profile.usesCn ? `${utilsDir}/cn${scriptExt}` : `${utilsDir}/classnames${scriptExt}`,
		animations: `${utilsDir}/animations${scriptExt}`,
	}
}

function resolveStyleFiles(stylesDir: string, profile: StylingProfile): StyleFiles {
	return {
		componentStylePattern: profile.componentStylePattern,
		animations: `${stylesDir}/animations${profile.styleExt}`,
	}
}

// ── File Structure Guides ───────────────────────────────────────

function buildSetupGuide(s: ProjectStructure): string[] {
	return [
		`${s.stylingConfig}              # styling/token configuration`,
		`${s.stylesDir}/`,
		`  ${basename(s.tokensFile)}                    # design token definitions`,
		`  ${basename(s.globalsFile)}                   # global base styles (reset, body defaults)`,
		`${s.layoutDir}/                    # layout components (created in later steps)`,
		`${s.uiDir}/                        # UI components (created in later steps)`,
		`${s.utilsDir}/`,
		`  ${basename(s.utilFiles.cn)}                       # className merge utility`,
	]
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
