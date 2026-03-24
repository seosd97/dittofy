import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { detectApps, findMonorepoRoot, resolveWorkspaceDeps } from "../workspace-detector.js"

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

describe("resolveWorkspaceDeps", () => {
	it("resolves workspace:* dependencies to local paths", async () => {
		setup({
			"package.json": JSON.stringify({
				workspaces: ["apps/*", "packages/*"],
			}),
			"apps/web/package.json": JSON.stringify({
				name: "@repo/web",
				dependencies: {
					"@repo/ui": "workspace:*",
					react: "^18.0.0",
				},
				devDependencies: {
					"@repo/config": "workspace:^",
				},
			}),
			"packages/ui/package.json": JSON.stringify({ name: "@repo/ui" }),
			"packages/config/package.json": JSON.stringify({ name: "@repo/config" }),
			"packages/utils/package.json": JSON.stringify({ name: "@repo/utils" }),
		})

		const deps = await resolveWorkspaceDeps(join(TEST_DIR, "apps/web"), TEST_DIR)
		expect(deps).toContain("packages/ui")
		expect(deps).toContain("packages/config")
		expect(deps).not.toContain("packages/utils")
	})

	it("returns empty for no workspace deps", async () => {
		setup({
			"apps/web/package.json": JSON.stringify({
				name: "@repo/web",
				dependencies: { react: "^18.0.0" },
			}),
		})

		const deps = await resolveWorkspaceDeps(join(TEST_DIR, "apps/web"), TEST_DIR)
		expect(deps).toEqual([])
	})

	it("returns empty when no package.json", async () => {
		setup({
			"apps/web/src/index.ts": "export {}",
		})

		const deps = await resolveWorkspaceDeps(join(TEST_DIR, "apps/web"), TEST_DIR)
		expect(deps).toEqual([])
	})
})

describe("detectApps", () => {
	it("detects apps with framework deps and scripts", async () => {
		setup({
			"package.json": JSON.stringify({
				workspaces: ["apps/*", "packages/*"],
			}),
			"apps/web/package.json": JSON.stringify({
				name: "@repo/web",
				scripts: { dev: "next dev", build: "next build" },
				dependencies: { next: "^14.0.0", react: "^18.0.0" },
			}),
			"apps/admin/package.json": JSON.stringify({
				name: "@repo/admin",
				scripts: { dev: "vite dev", build: "vite build" },
				dependencies: { vue: "^3.0.0" },
			}),
			"packages/ui/package.json": JSON.stringify({
				name: "@repo/ui",
				scripts: { build: "tsup" },
				dependencies: {},
			}),
		})

		const apps = await detectApps(TEST_DIR)
		expect(apps).toContain("apps/web")
		expect(apps).toContain("apps/admin")
		expect(apps).not.toContain("packages/ui")
	})

	it("returns empty when no apps found", async () => {
		setup({
			"packages/utils/package.json": JSON.stringify({
				name: "@repo/utils",
				scripts: { build: "tsc" },
			}),
		})

		const apps = await detectApps(TEST_DIR)
		expect(apps).toEqual([])
	})
})
