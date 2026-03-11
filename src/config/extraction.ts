import type { FileCategory } from "@defs/extraction.js"

/** Code extraction limits */
export const EXTRACTION_LIMITS = {
	maxFileSize: 100 * 1024,
	maxFiles: 200,
	svgContentThreshold: 10_000,
	fileTreeMaxDepth: 4,
} as const

/** File category extraction priority (lower = higher priority) */
export const FILE_CATEGORY_PRIORITY: Record<FileCategory, number> = {
	config: 0,
	component: 1,
	page: 2,
	layout: 3,
	style: 4,
	hook: 5,
	context: 6,
	store: 7,
	route: 8,
	type: 9,
	util: 10,
	api: 11,
	asset: 12,
	public: 13,
	test: 14,
	other: 15,
}

/** Glob patterns to ignore during file scanning */
export const IGNORE_PATTERNS = [
	"**/node_modules/**",
	"**/dist/**",
	"**/build/**",
	"**/out/**",
	"**/.next/**",
	"**/.nuxt/**",
	"**/.svelte-kit/**",
	"**/.astro/**",
	"**/.output/**",
	"**/.git/**",
	"**/.idea/**",
	"**/.vscode/**",
	"**/coverage/**",
	"**/__tests__/**",
	"**/*.test.*",
	"**/*.spec.*",
	"**/*.stories.*",
	"**/.storybook/**",
	"**/cypress/**",
	"**/e2e/**",
	"**/public/assets/**",
	"**/*.map",
	"**/CHANGELOG*",
	"**/LICENSE*",
	"**/.env*",
	"**/package-lock.json",
	"**/pnpm-lock.yaml",
	"**/yarn.lock",
] as const

/** File extensions to include in scanning */
export const INCLUDE_EXTENSIONS = [
	".tsx",
	".jsx",
	".vue",
	".svelte",
	".astro",
	".css",
	".scss",
	".sass",
	".less",
	".ts",
	".js",
	".mjs",
	".cjs",
	".svg",
	".json",
] as const

/** Config file glob patterns */
export const CONFIG_PATTERNS = [
	"package.json",
	"tailwind.config.*",
	"postcss.config.*",
	"tsconfig.json",
	"tsconfig.*.json",
	"next.config.*",
	"vite.config.*",
	"svelte.config.*",
	"astro.config.*",
	"nuxt.config.*",
] as const

/** Directory names to skip when building file tree */
export const TREE_IGNORE_DIRS = new Set([
	"node_modules",
	"dist",
	"build",
	"out",
	".next",
	".nuxt",
	".svelte-kit",
	".astro",
	".output",
	".git",
	".idea",
	".vscode",
	"coverage",
	"__tests__",
	".storybook",
	"cypress",
	"e2e",
])
