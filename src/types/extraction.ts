export interface ExtractionResult {
	projectMeta: ProjectMeta
	fileTree: FileTreeNode[]
	codeChunks: CodeChunk[]
	configFiles: ConfigFile[]
}

export interface ProjectMeta {
	name: string
	packageManager: string
	dependencies: Record<string, string>
	devDependencies: Record<string, string>
	scripts: Record<string, string>
}

export interface FileTreeNode {
	path: string
	type: "file" | "directory"
	extension?: string
	size?: number
	children?: FileTreeNode[]
}

export type FileCategory =
	| "component"
	| "page"
	| "layout"
	| "style"
	| "config"
	| "util"
	| "hook"
	| "context"
	| "store"
	| "type"
	| "test"
	| "asset"
	| "public"
	| "route"
	| "api"
	| "other"

export interface CodeChunk {
	filePath: string
	content: string
	category: FileCategory
	extension: string
	size: number
}

export interface ConfigFile {
	name: string
	filePath: string
	content: string
	type:
		| "tailwind"
		| "postcss"
		| "tsconfig"
		| "package"
		| "vite"
		| "next"
		| "svelte"
		| "astro"
		| "nuxt"
		| "other"
}
