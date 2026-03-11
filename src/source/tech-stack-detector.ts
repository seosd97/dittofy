import type { TechStack } from "@defs/analysis.js"
import type { CodeChunk, ConfigFile } from "@defs/extraction.js"

export function detectTechStack(configs: ConfigFile[], codeChunks: CodeChunk[]): TechStack {
	const packageJson = configs.find((c) => c.type === "package")
	const deps = packageJson ? parseDeps(packageJson.content) : {}

	return {
		framework: detectFramework(deps),
		language: detectLanguage(configs, codeChunks),
		styling: detectStyling(deps, configs),
		uiLibrary: detectUILibrary(deps),
		stateManagement: detectStateManagement(deps),
		buildTool: detectBuildTool(deps, configs),
	}
}

function parseDeps(packageJsonContent: string): Record<string, string> {
	try {
		const pkg = JSON.parse(packageJsonContent)
		return { ...pkg.dependencies, ...pkg.devDependencies }
	} catch {
		return {}
	}
}

function detectFramework(deps: Record<string, string>): TechStack["framework"] {
	if ("next" in deps) return { value: "Next.js", confidence: "high" }
	if ("nuxt" in deps) return { value: "Nuxt", confidence: "high" }
	if ("@sveltejs/kit" in deps) return { value: "SvelteKit", confidence: "high" }
	if ("astro" in deps) return { value: "Astro", confidence: "high" }
	if ("react" in deps) return { value: "React", confidence: "high" }
	if ("vue" in deps) return { value: "Vue", confidence: "high" }
	if ("svelte" in deps) return { value: "Svelte", confidence: "high" }
	if ("@angular/core" in deps) return { value: "Angular", confidence: "high" }
	return { value: "Unknown", confidence: "low" }
}

function detectLanguage(configs: ConfigFile[], codeChunks: CodeChunk[]): TechStack["language"] {
	const hasTsConfig = configs.some((c) => c.type === "tsconfig")
	const tsFiles = codeChunks.filter((c) => c.extension === ".ts" || c.extension === ".tsx")
	const jsFiles = codeChunks.filter((c) => c.extension === ".js" || c.extension === ".jsx")

	if (hasTsConfig || tsFiles.length > jsFiles.length) {
		return { value: "TypeScript", confidence: "high" }
	}
	return { value: "JavaScript", confidence: "high" }
}

function detectStyling(deps: Record<string, string>, configs: ConfigFile[]): TechStack["styling"] {
	// Tier 1: Tailwind or CSS Variables
	if ("tailwindcss" in deps || configs.some((c) => c.type === "tailwind")) {
		return { value: { approach: "Tailwind CSS", tier: 1 }, confidence: "high" }
	}

	// Tier 2: CSS Modules, SCSS, Styled Components
	if ("sass" in deps || "node-sass" in deps) {
		return { value: { approach: "SCSS", tier: 2 }, confidence: "high" }
	}
	if ("styled-components" in deps) {
		return { value: { approach: "Styled Components", tier: 2 }, confidence: "high" }
	}
	if ("@emotion/react" in deps || "@emotion/styled" in deps) {
		return { value: { approach: "Emotion", tier: 2 }, confidence: "high" }
	}

	// Tier 3: CSS-in-JS runtime
	if ("@vanilla-extract/css" in deps) {
		return { value: { approach: "Vanilla Extract", tier: 2 }, confidence: "high" }
	}

	// Check for CSS Modules usage in code
	const hasCssModules = configs.some(
		(c) => c.type === "vite" && c.content.includes("css") && c.content.includes("modules"),
	)
	if (hasCssModules) {
		return { value: { approach: "CSS Modules", tier: 2 }, confidence: "medium" }
	}

	return { value: { approach: "Plain CSS", tier: 1 }, confidence: "low" }
}

function detectUILibrary(deps: Record<string, string>): TechStack["uiLibrary"] {
	if ("@shadcn/ui" in deps || "@radix-ui/react-dialog" in deps) {
		return { value: "shadcn/ui", confidence: "high" }
	}
	if ("@mui/material" in deps) return { value: "Material UI", confidence: "high" }
	if ("antd" in deps) return { value: "Ant Design", confidence: "high" }
	if ("@chakra-ui/react" in deps) return { value: "Chakra UI", confidence: "high" }
	if ("@mantine/core" in deps) return { value: "Mantine", confidence: "high" }
	return undefined
}

function detectStateManagement(deps: Record<string, string>): TechStack["stateManagement"] {
	if ("zustand" in deps) return { value: "Zustand", confidence: "high" }
	if ("jotai" in deps) return { value: "Jotai", confidence: "high" }
	if ("recoil" in deps) return { value: "Recoil", confidence: "high" }
	if ("@reduxjs/toolkit" in deps || "redux" in deps) return { value: "Redux", confidence: "high" }
	if ("pinia" in deps) return { value: "Pinia", confidence: "high" }
	if ("vuex" in deps) return { value: "Vuex", confidence: "high" }
	if ("mobx" in deps) return { value: "MobX", confidence: "high" }
	return undefined
}

function detectBuildTool(
	deps: Record<string, string>,
	configs: ConfigFile[],
): TechStack["buildTool"] {
	if (configs.some((c) => c.type === "vite")) return { value: "Vite", confidence: "high" }
	if ("next" in deps) return { value: "Next.js (Webpack/Turbopack)", confidence: "medium" }
	if ("webpack" in deps) return { value: "Webpack", confidence: "high" }
	if ("esbuild" in deps) return { value: "esbuild", confidence: "high" }
	if ("parcel" in deps) return { value: "Parcel", confidence: "high" }
	return undefined
}
