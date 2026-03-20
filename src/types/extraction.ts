export interface ExtractionResult {
	projectMeta: ProjectMeta
	fileTree: FileTreeNode[]
}

export interface MonorepoContext {
	isMonorepo: boolean
	rootPath: string
	targetPath: string
	targetRelative: string
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

export interface CodeChunk {
	filePath: string
	content: string
	extension: string
	size: number
}
