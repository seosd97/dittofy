import { resolve } from "node:path"
import { runExtraction } from "@infra/source/index.js"
import { describe, expect, it } from "vitest"

const TEST_REPO = resolve(__dirname, "../../../../tests/fixtures/test-repo")

describe("runExtraction", () => {
	it("merges includePaths into file tree", async () => {
		// Use test-repo's own src dir as an "include path" relative to test-repo
		const result = await runExtraction(TEST_REPO, undefined, ["src"])

		expect(result.status).toBe("completed")
		expect(result.data).toBeDefined()

		const fileTree = result.data?.extraction.fileTree ?? []
		const includeNode = fileTree.find((n) => n.path === "src")
		// "src" appears both from scan and include — the include node is appended
		const includeNodes = fileTree.filter((n) => n.path === "src")
		expect(includeNodes.length).toBeGreaterThanOrEqual(2)
	})

	it("skips non-existent includePaths without error", async () => {
		const result = await runExtraction(TEST_REPO, undefined, ["non-existent-path"])

		expect(result.status).toBe("completed")
		expect(result.data).toBeDefined()
	})

	it("works without includePaths", async () => {
		const result = await runExtraction(TEST_REPO)

		expect(result.status).toBe("completed")
		expect(result.data).toBeDefined()
	})
})
