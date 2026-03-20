import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { findMonorepoRoot } from "../workspace-detector.js"

const TEST_DIR = join(tmpdir(), "ditto-workspace-test")

function setup(structure: Record<string, string>) {
	rmSync(TEST_DIR, { recursive: true, force: true })
	for (const [path, content] of Object.entries(structure)) {
		const fullPath = join(TEST_DIR, path)
		const dir = fullPath.substring(0, fullPath.lastIndexOf("/"))
		mkdirSync(dir, { recursive: true })
		writeFileSync(fullPath, content)
	}
}

afterEach(() => {
	rmSync(TEST_DIR, { recursive: true, force: true })
})

describe("findMonorepoRoot", () => {
	it("finds root with package.json workspaces", async () => {
		setup({
			"package.json": JSON.stringify({
				workspaces: ["apps/*", "packages/*"],
			}),
			"apps/web/package.json": JSON.stringify({ name: "web" }),
		})
		const root = await findMonorepoRoot(join(TEST_DIR, "apps/web"))
		expect(root).toBe(TEST_DIR)
	})

	it("finds root with pnpm-workspace.yaml", async () => {
		setup({
			"pnpm-workspace.yaml": "packages:\n  - apps/*\n  - packages/*",
			"apps/web/package.json": JSON.stringify({ name: "web" }),
		})
		const root = await findMonorepoRoot(join(TEST_DIR, "apps/web"))
		expect(root).toBe(TEST_DIR)
	})

	it("returns null for single project", async () => {
		setup({
			"package.json": JSON.stringify({ name: "single-app" }),
			"src/index.ts": "console.log('hello')",
		})
		const root = await findMonorepoRoot(TEST_DIR)
		expect(root).toBeNull()
	})

	it("returns null when no package.json exists", async () => {
		setup({
			"src/index.html": "<html></html>",
		})
		const root = await findMonorepoRoot(TEST_DIR)
		expect(root).toBeNull()
	})

	it("finds nearest root (not ancestor)", async () => {
		setup({
			"package.json": JSON.stringify({
				workspaces: ["projects/*"],
			}),
			"projects/mono/package.json": JSON.stringify({
				workspaces: ["apps/*"],
			}),
			"projects/mono/apps/web/package.json": JSON.stringify({
				name: "web",
			}),
		})
		const root = await findMonorepoRoot(join(TEST_DIR, "projects/mono/apps/web"))
		expect(root).toBe(join(TEST_DIR, "projects/mono"))
	})
})
