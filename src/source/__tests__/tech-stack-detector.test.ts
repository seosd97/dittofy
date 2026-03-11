import type { ConfigFile } from "@defs/extraction.js"
import { detectTechStack } from "@source/tech-stack-detector.js"
import { describe, expect, it } from "vitest"

function makePkgConfig(deps: Record<string, string>, devDeps?: Record<string, string>): ConfigFile {
	return {
		name: "package.json",
		filePath: "package.json",
		content: JSON.stringify({
			dependencies: deps,
			devDependencies: devDeps ?? {},
		}),
		type: "package",
	}
}

describe("detectTechStack", () => {
	it("detects Next.js + Tailwind stack", () => {
		const config = makePkgConfig(
			{ react: "^19.0.0", "react-dom": "^19.0.0", next: "^15.0.0" },
			{ tailwindcss: "^4.0.0" },
		)

		const result = detectTechStack([config], [])

		expect(result.framework.value).toBe("Next.js")
		expect(result.framework.confidence).toBe("high")
		expect(result.styling.value.approach).toBe("Tailwind CSS")
		expect(result.styling.value.tier).toBe(1)
	})

	it("detects Vue + SCSS", () => {
		const config = makePkgConfig({ vue: "^3.0.0" }, { sass: "^1.0.0" })

		const result = detectTechStack([config], [])

		expect(result.framework.value).toBe("Vue")
		expect(result.styling.value.approach).toBe("SCSS")
		expect(result.styling.value.tier).toBe(2)
	})

	it("detects state management libraries", () => {
		const config = makePkgConfig({ react: "^19.0.0", zustand: "^5.0.0" })

		const result = detectTechStack([config], [])

		expect(result.stateManagement?.value).toBe("Zustand")
	})

	it("detects UI libraries", () => {
		const config = makePkgConfig({
			react: "^19.0.0",
			"@radix-ui/react-dialog": "^1.0.0",
		})

		const result = detectTechStack([config], [])

		expect(result.uiLibrary?.value).toBe("shadcn/ui")
	})
})
