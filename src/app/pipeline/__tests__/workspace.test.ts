import { existsSync } from "node:fs"
import { rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createWorkspace } from "../workspace.js"

const TEST_DIR = resolve(tmpdir(), `ditto-workspace-test-${process.pid}`)

beforeEach(async () => {
	await rm(TEST_DIR, { recursive: true, force: true })
})

afterEach(async () => {
	await rm(TEST_DIR, { recursive: true, force: true })
})

describe("workspace", () => {
	it("creates .tmp directory", async () => {
		const ws = await createWorkspace(TEST_DIR)
		expect(existsSync(ws.tmpDir)).toBe(true)
	})

	it("writes and reads markdown", async () => {
		const ws = await createWorkspace(TEST_DIR)
		await ws.writeMarkdown("test.md", "# Hello")
		const content = await ws.readMarkdown("test.md")
		expect(content).toBe("# Hello")
	})

	it("writes and reads JSON", async () => {
		const ws = await createWorkspace(TEST_DIR)
		await ws.writeJSON("test.json", { key: "value" })
		const data = await ws.readJSON<{ key: string }>("test.json")
		expect(data.key).toBe("value")
	})

	it("checks file existence", async () => {
		const ws = await createWorkspace(TEST_DIR)
		expect(await ws.exists("nonexistent.md")).toBe(false)
		await ws.writeMarkdown("exists.md", "content")
		expect(await ws.exists("exists.md")).toBe(true)
	})

	it("cleans up .tmp directory", async () => {
		const ws = await createWorkspace(TEST_DIR)
		await ws.writeMarkdown("test.md", "content")
		await ws.cleanup()
		expect(existsSync(ws.tmpDir)).toBe(false)
	})
})
