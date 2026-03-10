import { describe, expect, it } from "vitest"
import { categorizeFile } from "../code-extractor.js"

describe("categorizeFile", () => {
	it("categorizes TSX files as components", () => {
		expect(categorizeFile("src/components/Button.tsx")).toBe("component")
	})

	it("categorizes page files", () => {
		expect(categorizeFile("src/pages/index.tsx")).toBe("page")
		expect(categorizeFile("src/app/page.tsx")).toBe("page")
	})

	it("categorizes style files", () => {
		expect(categorizeFile("src/globals.css")).toBe("style")
		expect(categorizeFile("src/theme.scss")).toBe("style")
	})

	it("categorizes config files", () => {
		expect(categorizeFile("package.json")).toBe("config")
		expect(categorizeFile("tailwind.config.ts")).toBe("config")
		expect(categorizeFile("next.config.mjs")).toBe("config")
	})

	it("categorizes hooks", () => {
		expect(categorizeFile("src/hooks/useAuth.ts")).toBe("hook")
	})

	it("categorizes layout files", () => {
		expect(categorizeFile("src/app/layout.tsx")).toBe("layout")
	})

	it("categorizes utility files", () => {
		expect(categorizeFile("src/utils/format.ts")).toBe("util")
		expect(categorizeFile("src/lib/api.ts")).toBe("util")
	})

	it("categorizes API routes", () => {
		expect(categorizeFile("src/api/users.ts")).toBe("api")
	})

	it("categorizes store files", () => {
		expect(categorizeFile("src/stores/auth.ts")).toBe("store")
	})
})
