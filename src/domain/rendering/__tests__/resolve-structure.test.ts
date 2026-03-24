import type { TechStack } from "@defs/analysis.js"
import { resolveEnvironment } from "@domain/rendering/resolve-environment.js"
import {
	type ProjectStructure,
	buildFileStructureGuide,
	resolveProjectStructure,
} from "@domain/rendering/resolve-structure.js"
import { describe, expect, it } from "vitest"

// ── Helpers ──

function createTechStack(overrides: Partial<TechStack> = {}): TechStack {
	return {
		framework: { value: "Next.js", confidence: "high" },
		language: { value: "TypeScript", confidence: "high" },
		styling: { value: { approach: "Tailwind CSS", tier: 1 }, confidence: "high" },
		buildTool: { value: "Vite", confidence: "high" },
		uiLibrary: undefined,
		...overrides,
	}
}

function envFor(overrides: Partial<TechStack> = {}) {
	return resolveEnvironment(createTechStack(overrides))
}

function structureFor(overrides: Partial<TechStack> = {}) {
	return resolveProjectStructure(envFor(overrides))
}

// ── resolveProjectStructure ──

describe("resolveProjectStructure", () => {
	describe("Next.js (App Router)", () => {
		const s = structureFor()

		it("uses src/app for pages", () => {
			expect(s.pagesDir).toBe("src/app")
			expect(s.pageFiles.home).toBe("src/app/page.tsx")
			expect(s.pageFiles.about).toBe("src/app/about/page.tsx")
		})

		it("uses src/app/layout.tsx as root layout", () => {
			expect(s.rootLayout).toBe("src/app/layout.tsx")
		})

		it("uses src/styles for styles", () => {
			expect(s.stylesDir).toBe("src/styles")
			expect(s.tokensFile).toBe("src/styles/tokens.css")
			expect(s.globalsFile).toBe("src/styles/globals.css")
		})

		it("uses src/components for components", () => {
			expect(s.layoutDir).toBe("src/components/layout")
			expect(s.uiDir).toBe("src/components/ui")
		})

		it("uses src/lib/utils for utilities", () => {
			expect(s.utilsDir).toBe("src/lib/utils")
			expect(s.utilFiles.cn).toBe("src/lib/utils/cn.ts")
			expect(s.utilFiles.animations).toBe("src/lib/utils/animations.ts")
		})

		it("uses .tsx component extension for TypeScript", () => {
			expect(s.componentExt).toBe(".tsx")
			expect(s.scriptExt).toBe(".ts")
		})

		it("uses tailwind.config.ts when Tailwind detected", () => {
			expect(s.stylingConfig).toBe("tailwind.config.ts")
		})

		it("layout files follow PascalCase convention", () => {
			expect(s.layoutFiles.header).toBe("src/components/layout/Header.tsx")
			expect(s.layoutFiles.footer).toBe("src/components/layout/Footer.tsx")
			expect(s.layoutFiles.navigation).toBe("src/components/layout/Navigation.tsx")
			expect(s.layoutFiles.pageContainer).toBe("src/components/layout/PageContainer.tsx")
		})
	})

	describe("Next.js (Pages Router)", () => {
		const s = structureFor({
			framework: { value: "Next.js (Pages Router)", confidence: "high" },
		})

		it("uses src/pages for pages", () => {
			expect(s.pagesDir).toBe("src/pages")
			expect(s.pageFiles.home).toBe("src/pages/index.tsx")
			expect(s.pageFiles.about).toBe("src/pages/about.tsx")
		})

		it("uses _app as root layout", () => {
			expect(s.rootLayout).toBe("src/pages/_app.tsx")
		})
	})

	describe("React SPA (default)", () => {
		const s = structureFor({
			framework: { value: "React", confidence: "high" },
		})

		it("uses src/pages for pages", () => {
			expect(s.pagesDir).toBe("src/pages")
			expect(s.pageFiles.home).toBe("src/pages/Home.tsx")
			expect(s.pageFiles.about).toBe("src/pages/About.tsx")
		})

		it("uses src/App.tsx as root layout", () => {
			expect(s.rootLayout).toBe("src/App.tsx")
		})

		it("uses src/utils for utilities", () => {
			expect(s.utilsDir).toBe("src/utils")
		})
	})

	describe("Vue", () => {
		const s = structureFor({
			framework: { value: "Vue", confidence: "high" },
			language: { value: "TypeScript", confidence: "high" },
		})

		it("uses .vue component extension", () => {
			expect(s.componentExt).toBe(".vue")
			expect(s.scriptExt).toBe(".ts")
		})

		it("uses src/views for pages", () => {
			expect(s.pagesDir).toBe("src/views")
			expect(s.pageFiles.home).toBe("src/views/Home.vue")
			expect(s.pageFiles.about).toBe("src/views/About.vue")
		})

		it("uses src/App.vue as root layout", () => {
			expect(s.rootLayout).toBe("src/App.vue")
		})

		it("uses src/assets/styles for styles", () => {
			expect(s.stylesDir).toBe("src/assets/styles")
			expect(s.tokensFile).toBe("src/assets/styles/tokens.css")
		})

		it("uses src/utils for utilities", () => {
			expect(s.utilsDir).toBe("src/utils")
		})
	})

	describe("Nuxt", () => {
		const s = structureFor({
			framework: { value: "Nuxt", confidence: "high" },
			language: { value: "TypeScript", confidence: "high" },
		})

		it("uses .vue component extension", () => {
			expect(s.componentExt).toBe(".vue")
		})

		it("uses Nuxt conventional directories", () => {
			expect(s.pagesDir).toBe("pages")
			expect(s.rootLayout).toBe("layouts/default.vue")
			expect(s.layoutDir).toBe("components/layout")
			expect(s.stylesDir).toBe("assets/css")
		})

		it("uses top-level utils/ for utilities", () => {
			expect(s.utilsDir).toBe("utils")
		})

		it("uses pages/index.vue for home", () => {
			expect(s.pageFiles.home).toBe("pages/index.vue")
			expect(s.pageFiles.about).toBe("pages/about.vue")
		})
	})

	describe("SvelteKit", () => {
		const s = structureFor({
			framework: { value: "SvelteKit", confidence: "high" },
			language: { value: "TypeScript", confidence: "high" },
		})

		it("uses .svelte component extension", () => {
			expect(s.componentExt).toBe(".svelte")
			expect(s.scriptExt).toBe(".ts")
		})

		it("uses SvelteKit route conventions", () => {
			expect(s.pagesDir).toBe("src/routes")
			expect(s.rootLayout).toBe("src/routes/+layout.svelte")
			expect(s.pageFiles.home).toBe("src/routes/+page.svelte")
			expect(s.pageFiles.about).toBe("src/routes/about/+page.svelte")
		})

		it("uses src/lib for components and utils", () => {
			expect(s.layoutDir).toBe("src/lib/components/layout")
			expect(s.uiDir).toBe("src/lib/components/ui")
			expect(s.utilsDir).toBe("src/lib/utils")
		})
	})

	describe("JavaScript (no TypeScript)", () => {
		const s = structureFor({
			framework: { value: "React", confidence: "high" },
			language: { value: "JavaScript", confidence: "high" },
		})

		it("uses .jsx/.js extensions", () => {
			expect(s.componentExt).toBe(".jsx")
			expect(s.scriptExt).toBe(".js")
			expect(s.layoutFiles.header).toBe("src/components/layout/Header.jsx")
			expect(s.utilFiles.cn).toBe("src/utils/cn.js")
		})
	})

	describe("greenfield fallback", () => {
		const s = structureFor({
			framework: { value: "Unknown", confidence: "low" },
			language: { value: "TypeScript", confidence: "high" },
		})

		it("falls back to React SPA structure", () => {
			expect(s.rootLayout).toBe("src/App.tsx")
			expect(s.pagesDir).toBe("src/pages")
		})
	})
})

// ── Styling config resolution ──

describe("styling config resolution", () => {
	it("sets tailwind.config.ts for Tailwind", () => {
		const s = structureFor()
		expect(s.stylingConfig).toBe("tailwind.config.ts")
	})

	it("sets null for CSS Modules", () => {
		const s = structureFor({
			styling: { value: { approach: "CSS Modules", tier: 2 }, confidence: "high" },
		})
		expect(s.stylingConfig).toBeNull()
	})

	it("sets null for Styled Components", () => {
		const s = structureFor({
			styling: { value: { approach: "Styled Components", tier: 2 }, confidence: "high" },
		})
		expect(s.stylingConfig).toBeNull()
	})
})

// ── Component style patterns ──

describe("styleFiles.componentStylePattern", () => {
	it("describes co-located .module.css for CSS Modules", () => {
		const s = structureFor({
			styling: { value: { approach: "CSS Modules", tier: 2 }, confidence: "high" },
		})
		expect(s.styleFiles.componentStylePattern).toContain(".module.css")
	})

	it("describes co-located .module.scss for SCSS", () => {
		const s = structureFor({
			styling: { value: { approach: "SCSS", tier: 2 }, confidence: "high" },
		})
		expect(s.styleFiles.componentStylePattern).toContain(".module.scss")
	})

	it("describes inline styled() for Styled Components", () => {
		const s = structureFor({
			styling: { value: { approach: "Styled Components", tier: 2 }, confidence: "high" },
		})
		expect(s.styleFiles.componentStylePattern).toContain("styled()")
	})

	it("describes inline styled() for Emotion", () => {
		const s = structureFor({
			styling: { value: { approach: "Emotion", tier: 2 }, confidence: "high" },
		})
		expect(s.styleFiles.componentStylePattern).toContain("styled()")
	})

	it("describes utility classes for Tailwind", () => {
		const s = structureFor()
		expect(s.styleFiles.componentStylePattern).toContain("Utility classes")
	})

	it("describes plain CSS for plain CSS (fallback)", () => {
		const s = structureFor({
			styling: { value: { approach: "Plain CSS", tier: 1 }, confidence: "high" },
		})
		expect(s.styleFiles.componentStylePattern).toContain("Plain CSS")
	})
})

// ── Vanilla Extract ──

describe("Vanilla Extract resolution", () => {
	const s = structureFor({
		styling: { value: { approach: "Vanilla Extract", tier: 2 }, confidence: "high" },
	})

	it("uses .css.ts extension for tokens file", () => {
		expect(s.tokensFile).toBe("src/styles/tokens.css.ts")
	})

	it("uses .css.ts extension for globals file", () => {
		expect(s.globalsFile).toBe("src/styles/globals.css.ts")
	})

	it("uses .css.ts extension for animations", () => {
		expect(s.styleFiles.animations).toBe("src/styles/animations.css.ts")
	})

	it("describes co-located .css.ts component style pattern", () => {
		expect(s.styleFiles.componentStylePattern).toContain(".css.ts")
	})

	it("has no styling config file", () => {
		expect(s.stylingConfig).toBeNull()
	})

	it("uses classnames instead of cn", () => {
		expect(s.utilFiles.cn).toContain("classnames")
	})
})

// ── Animation files ──

describe("animation files", () => {
	it("uses .css animations file for Tailwind", () => {
		const s = structureFor()
		expect(s.styleFiles.animations).toBe("src/styles/animations.css")
	})

	it("uses .scss animations file for SCSS", () => {
		const s = structureFor({
			styling: { value: { approach: "SCSS", tier: 2 }, confidence: "high" },
		})
		expect(s.styleFiles.animations).toContain(".scss")
	})

	it("uses .ts animations file for CSS-in-JS", () => {
		const s = structureFor({
			styling: { value: { approach: "Styled Components", tier: 2 }, confidence: "high" },
		})
		expect(s.styleFiles.animations).toContain(".ts")
	})

	it("util animations uses script extension", () => {
		const s = structureFor()
		expect(s.utilFiles.animations).toBe("src/lib/utils/animations.ts")
	})
})

// ── cn utility ──

describe("cn utility naming", () => {
	it("uses cn for Tailwind projects", () => {
		const s = structureFor()
		expect(s.utilFiles.cn).toContain("/cn.")
	})

	it("uses classnames for non-Tailwind projects", () => {
		const s = structureFor({
			styling: { value: { approach: "CSS Modules", tier: 2 }, confidence: "high" },
		})
		expect(s.utilFiles.cn).toContain("/classnames.")
	})
})

// ── buildFileStructureGuide ──

describe("buildFileStructureGuide", () => {
	const s = structureFor()

	it("includes File Structure heading", () => {
		const guide = buildFileStructureGuide("setup", s)
		expect(guide).toContain("## File Structure")
	})

	describe("setup", () => {
		const guide = buildFileStructureGuide("setup", s)

		it("includes styling config", () => {
			expect(guide).toContain("tailwind.config.ts")
		})

		it("includes token and globals files", () => {
			expect(guide).toContain("tokens.css")
			expect(guide).toContain("globals.css")
		})

		it("includes layout and ui directories", () => {
			expect(guide).toContain("src/components/layout/")
			expect(guide).toContain("src/components/ui/")
		})

		it("includes utils directory with cn utility", () => {
			expect(guide).toContain("src/lib/utils/")
			expect(guide).toContain("cn.ts")
		})
	})

	describe("design-tokens", () => {
		const guide = buildFileStructureGuide("design-tokens", s)

		it("references token file", () => {
			expect(guide).toContain("src/styles/tokens.css")
		})

		it("references styling config", () => {
			expect(guide).toContain("tailwind.config.ts")
		})
	})

	describe("typography", () => {
		const guide = buildFileStructureGuide("typography", s)

		it("references token file for extending", () => {
			expect(guide).toContain("tokens.css")
			expect(guide).toContain("extend existing")
		})
	})

	describe("layout-shell", () => {
		const guide = buildFileStructureGuide("layout-shell", s)

		it("includes root layout", () => {
			expect(guide).toContain("src/app/layout.tsx")
		})

		it("includes all layout component files", () => {
			expect(guide).toContain("Header.tsx")
			expect(guide).toContain("Footer.tsx")
			expect(guide).toContain("Navigation.tsx")
			expect(guide).toContain("PageContainer.tsx")
		})
	})

	describe("showcase-pages", () => {
		const guide = buildFileStructureGuide("showcase-pages", s)

		it("includes page files", () => {
			expect(guide).toContain("src/app/page.tsx")
			expect(guide).toContain("src/app/about/page.tsx")
		})

		it("includes UI component examples", () => {
			expect(guide).toContain("Button.tsx")
			expect(guide).toContain("Card.tsx")
			expect(guide).toContain("Section.tsx")
		})

		it("includes component styling pattern", () => {
			expect(guide).toContain("Component styling")
			expect(guide).toContain("Utility classes")
		})
	})

	describe("responsive", () => {
		const guide = buildFileStructureGuide("responsive", s)

		it("indicates modifying existing files", () => {
			expect(guide).toContain("Modify existing files")
		})

		it("references layout and page files", () => {
			expect(guide).toContain("src/app/layout.tsx")
			expect(guide).toContain("Header.tsx")
			expect(guide).toContain("Navigation.tsx")
		})
	})

	describe("interactions", () => {
		const guide = buildFileStructureGuide("interactions", s)

		it("indicates modifying existing files", () => {
			expect(guide).toContain("Modify existing files")
		})

		it("includes animation files (style + util)", () => {
			expect(guide).toContain("src/styles/animations.css")
			expect(guide).toContain("src/lib/utils/animations.ts")
		})

		it("references UI components for states", () => {
			expect(guide).toContain("Button.tsx")
			expect(guide).toContain("Card.tsx")
		})
	})

	describe("without styling config", () => {
		const noTailwind = structureFor({
			styling: { value: { approach: "CSS Modules", tier: 2 }, confidence: "high" },
		})

		it("omits styling config from setup guide", () => {
			const guide = buildFileStructureGuide("setup", noTailwind)
			expect(guide).not.toContain("tailwind.config")
		})

		it("omits styling config from design-tokens guide", () => {
			const guide = buildFileStructureGuide("design-tokens", noTailwind)
			expect(guide).not.toContain("tailwind.config")
		})
	})

	describe("Vue structure in guides", () => {
		const vueStructure = structureFor({
			framework: { value: "Vue", confidence: "high" },
			language: { value: "TypeScript", confidence: "high" },
		})

		it("uses .vue extension in layout-shell guide", () => {
			const guide = buildFileStructureGuide("layout-shell", vueStructure)
			expect(guide).toContain("Header.vue")
			expect(guide).toContain("src/App.vue")
		})

		it("uses src/views in showcase-pages guide", () => {
			const guide = buildFileStructureGuide("showcase-pages", vueStructure)
			expect(guide).toContain("src/views/Home.vue")
			expect(guide).toContain("src/views/About.vue")
		})
	})

	describe("SvelteKit structure in guides", () => {
		const svelteStructure = structureFor({
			framework: { value: "SvelteKit", confidence: "high" },
			language: { value: "TypeScript", confidence: "high" },
		})

		it("uses +layout.svelte in layout-shell guide", () => {
			const guide = buildFileStructureGuide("layout-shell", svelteStructure)
			expect(guide).toContain("src/routes/+layout.svelte")
		})

		it("uses src/lib paths in showcase-pages guide", () => {
			const guide = buildFileStructureGuide("showcase-pages", svelteStructure)
			expect(guide).toContain("src/routes/+page.svelte")
			expect(guide).toContain("src/routes/about/+page.svelte")
			expect(guide).toContain("Button.svelte")
		})
	})
})
