import type { FileTreeNode } from "@defs/extraction.js"
import { describe, expect, it, vi } from "vitest"
import { FileSelectionError, flattenTreePaths, resolveFiles } from "../file-resolver.js"

vi.mock("@infra/logger.js", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const tree: FileTreeNode[] = [
	{
		path: "src",
		type: "directory",
		children: [
			{ path: "Button.tsx", type: "file", extension: ".tsx", size: 100 },
			{ path: "theme.css.ts", type: "file", extension: ".ts", size: 200 },
			{
				path: "styles",
				type: "directory",
				children: [{ path: "tokens.ts", type: "file", extension: ".ts", size: 50 }],
			},
		],
	},
	{ path: "tailwind.config.ts", type: "file", extension: ".ts", size: 300 },
]

function makePlan(fileSelection: Record<string, string[]>) {
	return {
		projectSummary: "",
		aspects: Object.keys(fileSelection),
		waves: [],
		fileSelection,
	} as ReturnType<typeof resolveFiles> extends never ? never : Parameters<typeof resolveFiles>[0]
}

describe("flattenTreePaths", () => {
	it("flattens nested tree into full paths", () => {
		const paths = flattenTreePaths(tree)
		expect(paths).toContain("src/Button.tsx")
		expect(paths).toContain("src/theme.css.ts")
		expect(paths).toContain("src/styles/tokens.ts")
		expect(paths).toContain("tailwind.config.ts")
		expect(paths.size).toBe(4)
	})
})

describe("resolveFiles", () => {
	it("exact match resolves directly", () => {
		const plan = makePlan({ designTokens: ["src/theme.css.ts", "tailwind.config.ts"] })
		const result = resolveFiles(plan, tree)
		expect(result.matchRate).toBe(1)
		expect(plan.fileSelection.designTokens).toEqual(["src/theme.css.ts", "tailwind.config.ts"])
	})

	it("suffix match resolves partial paths", () => {
		const plan = makePlan({ designTokens: ["Button.tsx"] })
		const result = resolveFiles(plan, tree)
		expect(result.matchRate).toBe(1)
		expect(plan.fileSelection.designTokens).toEqual(["src/Button.tsx"])
	})

	it("filename-only match resolves unique filenames", () => {
		const plan = makePlan({ designTokens: ["tokens.ts"] })
		const result = resolveFiles(plan, tree)
		expect(result.matchRate).toBe(1)
		expect(plan.fileSelection.designTokens).toEqual(["src/styles/tokens.ts"])
	})

	it("unresolvable paths are filtered out", () => {
		const plan = makePlan({ designTokens: ["src/theme.css.ts", "nonexistent.ts"] })
		const result = resolveFiles(plan, tree)
		expect(result.matchRate).toBe(0.5)
		expect(plan.fileSelection.designTokens).toEqual(["src/theme.css.ts"])
	})

	it("throws FileSelectionError when match rate < 50%", () => {
		const plan = makePlan({
			designTokens: ["a.ts", "b.ts", "c.ts", "tailwind.config.ts"],
		})
		expect(() => resolveFiles(plan, tree)).toThrow(FileSelectionError)

		try {
			resolveFiles(makePlan({ designTokens: ["a.ts", "b.ts", "c.ts", "tailwind.config.ts"] }), tree)
		} catch (e) {
			const err = e as FileSelectionError
			expect(err.matchRate).toBe(0.25)
			expect(err.totalSelected).toBe(4)
			expect(err.totalResolved).toBe(1)
		}
	})

	it("empty file selection returns matchRate 1", () => {
		const plan = makePlan({})
		expect(resolveFiles(plan, tree).matchRate).toBe(1)
	})
})
