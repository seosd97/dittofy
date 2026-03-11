import { resolve } from "node:path"
import { scanFiles } from "@source/file-scanner.js"
import { describe, expect, it } from "vitest"

const TEST_REPO = resolve(__dirname, "../../../tests/fixtures/test-repo")

describe("scanFiles", () => {
	it("scans test repo and finds relevant files", async () => {
		const result = await scanFiles(TEST_REPO)

		expect(result.relevantFiles.length).toBeGreaterThan(0)
		expect(result.stats.relevant).toBeGreaterThan(0)
	})

	it("finds TSX component files", async () => {
		const result = await scanFiles(TEST_REPO)

		const tsxFiles = result.relevantFiles.filter((f) => f.endsWith(".tsx"))
		expect(tsxFiles.length).toBeGreaterThanOrEqual(3)
	})

	it("finds config files", async () => {
		const result = await scanFiles(TEST_REPO)

		expect(result.configFiles).toContain("package.json")
		expect(result.configFiles).toContain("tsconfig.json")
	})

	it("finds CSS files", async () => {
		const result = await scanFiles(TEST_REPO)

		const cssFiles = result.relevantFiles.filter((f) => f.endsWith(".css"))
		expect(cssFiles.length).toBeGreaterThanOrEqual(1)
	})

	it("builds file tree", async () => {
		const result = await scanFiles(TEST_REPO)

		expect(result.fileTree.length).toBeGreaterThan(0)
		const srcDir = result.fileTree.find((n) => n.path === "src")
		expect(srcDir).toBeDefined()
		expect(srcDir?.type).toBe("directory")
	})
})
