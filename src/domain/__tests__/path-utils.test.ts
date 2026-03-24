import { describe, expect, it } from "vitest"
import { extractProjectName } from "../path-utils.js"

describe("extractProjectName", () => {
	it("extracts name from GitHub URL", () => {
		expect(extractProjectName("https://github.com/user/my-app")).toBe("my-app")
	})

	it("removes .git suffix", () => {
		expect(extractProjectName("https://github.com/user/my-app.git")).toBe("my-app")
	})

	it("extracts name from local path", () => {
		expect(extractProjectName("/home/user/projects/my-app")).toBe("my-app")
	})

	it("extracts name from relative path", () => {
		expect(extractProjectName("./my-app")).toBe("my-app")
	})
})
