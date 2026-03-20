import { resolve } from "node:path"
import { scanFiles } from "@source/file-scanner.js"
import { describe, expect, it } from "vitest"

const TEST_REPO = resolve(__dirname, "../../../tests/fixtures/test-repo")

describe("scanFiles", () => {
	it("scans test repo and finds files", async () => {
		const result = await scanFiles(TEST_REPO)

		expect(result.stats.totalScanned).toBeGreaterThan(0)
	})

	it("builds file tree", async () => {
		const result = await scanFiles(TEST_REPO)

		expect(result.fileTree.length).toBeGreaterThan(0)
		const srcDir = result.fileTree.find((n) => n.path === "src")
		expect(srcDir).toBeDefined()
		expect(srcDir?.type).toBe("directory")
	})
})
