import type { ExtractionOutput, FileTreeNode } from "@defs/extraction.js"

// ── Constants ───────────────────────────────────────────────

export const UI_PACKAGE_HINTS = [
	"ui",
	"components",
	"design",
	"theme",
	"tokens",
	"styles",
	"config",
]

// ── Tree Rendering ──────────────────────────────────────────

export function renderFileTree(tree: FileTreeNode[], prefix = "", depth = 0): string {
	if (depth > 4) return ""
	const lines: string[] = []
	if (depth === 0) lines.push("# Project Structure\n")

	for (const node of tree) {
		if (node.type === "directory") {
			lines.push(`${prefix}- ${node.path}/`)
			if (node.children?.length) {
				lines.push(renderFileTree(node.children, `${prefix}  `, depth + 1))
			}
		} else {
			const size = node.size != null ? ` (${formatSize(node.size)})` : ""
			lines.push(`${prefix}- ${node.path}${size}`)
		}
	}

	return lines.filter(Boolean).join("\n")
}

/**
 * Render a 2-level tree for monorepo:
 * - Overview of root (depth 3, directories + file counts)
 * - Target package full tree (depth 5)
 * - Detected UI packages full tree (depth 5)
 */
export function renderMonorepoTree(rootTree: FileTreeNode[], targetRelative: string): string {
	const lines: string[] = ["# Project Structure\n"]

	// 1. Overview (depth 3, show directory structure with file counts)
	lines.push("## Overview")
	lines.push(renderTreeSummary(rootTree, 0, 3))
	lines.push("")

	// 2. Target package (full depth)
	const targetNode = findTreeNode(rootTree, targetRelative)
	if (targetNode?.children) {
		lines.push(`## Target: ${targetRelative}`)
		lines.push(renderFileTree(targetNode.children, "", 0))
		lines.push("")
	}

	// 3. UI-related packages (full depth, excluding target)
	const uiPackages = findUIPackages(rootTree, targetRelative)
	if (uiPackages.length > 0) {
		lines.push("## Related Packages")
		for (const { path, node } of uiPackages) {
			lines.push(`### ${path}`)
			if (node.children) {
				lines.push(renderFileTree(node.children, "", 0))
			}
			lines.push("")
		}
	}

	return lines.filter(Boolean).join("\n")
}

/** Render tree showing only directories and file counts (for overview) */
export function renderTreeSummary(
	tree: FileTreeNode[],
	depth: number,
	maxDepth: number,
	prefix = "",
): string {
	if (depth >= maxDepth) return ""
	const lines: string[] = []

	for (const node of tree) {
		if (node.type === "directory") {
			const fileCount = countFiles(node)
			lines.push(`${prefix}- ${node.path}/ (${fileCount} files)`)
			if (node.children && depth < maxDepth - 1) {
				const sub = renderTreeSummary(node.children, depth + 1, maxDepth, `${prefix}  `)
				if (sub) lines.push(sub)
			}
		}
		// Skip individual files in overview
	}

	return lines.join("\n")
}

/** Count all files recursively in a tree node */
export function countFiles(node: FileTreeNode): number {
	if (node.type === "file") return 1
	if (!node.children) return 0
	return node.children.reduce((sum, child) => sum + countFiles(child), 0)
}

/** Find a tree node by relative path (e.g., "apps/web") */
export function findTreeNode(tree: FileTreeNode[], relativePath: string): FileTreeNode | null {
	const parts = relativePath.split("/").filter(Boolean)
	let current = tree

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]
		const found = current.find((n) => n.path === part && n.type === "directory")
		if (!found) return null
		if (i === parts.length - 1) return found
		if (!found.children) return null
		current = found.children
	}

	return null
}

/** Find UI-related packages in the tree (excluding target) */
export function findUIPackages(
	tree: FileTreeNode[],
	targetRelative: string,
): { path: string; node: FileTreeNode }[] {
	const results: { path: string; node: FileTreeNode }[] = []

	// Look in common monorepo package directories
	const packageDirs = tree.filter(
		(n) => n.type === "directory" && ["packages", "libs", "modules"].includes(n.path),
	)

	for (const pkgDir of packageDirs) {
		if (!pkgDir.children) continue
		for (const pkg of pkgDir.children) {
			if (pkg.type !== "directory") continue
			const pkgPath = `${pkgDir.path}/${pkg.path}`
			// Skip if this is the target itself
			if (pkgPath === targetRelative) continue
			// Check if it's a UI-related package
			if (isUIPackage(pkg.path)) {
				results.push({ path: pkgPath, node: pkg })
			}
		}
	}

	return results
}

export function isUIPackage(dirName: string): boolean {
	const lower = dirName.toLowerCase()
	return UI_PACKAGE_HINTS.some((hint) => lower.includes(hint))
}

export function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`
	return `${(bytes / 1024).toFixed(1)}KB`
}

// ── Project Meta ────────────────────────────────────────────

export function renderProjectMeta(extraction: ExtractionOutput): string {
	const { techStack } = extraction
	const meta = extraction.extraction.projectMeta

	const lines: string[] = ["# Project Meta\n"]

	lines.push("## Detected Stack")
	lines.push(`- Framework: ${techStack.framework.value}`)
	lines.push(`- Language: ${techStack.language.value}`)
	lines.push(
		`- Styling: ${typeof techStack.styling.value === "string" ? techStack.styling.value : techStack.styling.value.approach}`,
	)
	if (techStack.buildTool) lines.push(`- Build Tool: ${techStack.buildTool.value}`)
	if (techStack.uiLibrary) lines.push(`- UI Library: ${techStack.uiLibrary.value}`)
	lines.push("")

	if (extraction.monorepo.isMonorepo) {
		lines.push("")
		lines.push("## Monorepo")
		lines.push(`- Root: ${extraction.monorepo.rootPath}`)
		lines.push(`- Target: ${extraction.monorepo.targetRelative}`)
		if (extraction.monorepo.depPaths.length > 0) {
			lines.push(`- Workspace deps: ${extraction.monorepo.depPaths.join(", ")}`)
		}
	}

	if (meta.dependencies && Object.keys(meta.dependencies).length > 0) {
		lines.push("## Dependencies")
		lines.push("### Production")
		for (const [name, version] of Object.entries(meta.dependencies).slice(0, 20)) {
			lines.push(`- ${name}: ${version}`)
		}
		lines.push("")
	}

	if (meta.devDependencies && Object.keys(meta.devDependencies).length > 0) {
		lines.push("### Development")
		for (const [name, version] of Object.entries(meta.devDependencies).slice(0, 20)) {
			lines.push(`- ${name}: ${version}`)
		}
		lines.push("")
	}

	if (meta.scripts && Object.keys(meta.scripts).length > 0) {
		lines.push("## Scripts")
		for (const [name, cmd] of Object.entries(meta.scripts)) {
			lines.push(`- ${name}: ${cmd}`)
		}
	}

	return lines.join("\n")
}
