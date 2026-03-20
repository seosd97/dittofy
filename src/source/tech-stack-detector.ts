import type { TechStack } from "@defs/analysis.js"
import type { ProjectMeta } from "@defs/extraction.js"

export function detectTechStack(projectMeta: ProjectMeta): TechStack {
	const deps = { ...projectMeta.dependencies, ...projectMeta.devDependencies }

	return {
		framework: detectFramework(deps),
		language: detectLanguage(projectMeta),
		styling: detectStyling(deps),
		uiLibrary: detectUILibrary(deps),
		stateManagement: detectStateManagement(deps),
		buildTool: detectBuildTool(deps),
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

function detectLanguage(projectMeta: ProjectMeta): TechStack["language"] {
	const allDeps = { ...projectMeta.dependencies, ...projectMeta.devDependencies }
	if ("typescript" in allDeps) {
		return { value: "TypeScript", confidence: "high" }
	}
	return { value: "JavaScript", confidence: "high" }
}

function detectStyling(deps: Record<string, string>): TechStack["styling"] {
	// Tier 1: Tailwind or CSS Variables
	if ("tailwindcss" in deps) {
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

function detectBuildTool(deps: Record<string, string>): TechStack["buildTool"] {
	if ("vite" in deps) return { value: "Vite", confidence: "high" }
	if ("next" in deps) return { value: "Next.js (Webpack/Turbopack)", confidence: "medium" }
	if ("webpack" in deps) return { value: "Webpack", confidence: "high" }
	if ("esbuild" in deps) return { value: "esbuild", confidence: "high" }
	if ("parcel" in deps) return { value: "Parcel", confidence: "high" }
	return undefined
}
