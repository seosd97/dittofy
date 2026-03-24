import type { ProjectMeta } from "@defs/extraction.js"
import { detectTechStack } from "@infra/source/tech-stack-detector.js"
import { describe, expect, it } from "vitest"

function makeMeta(deps: Record<string, string>, devDeps?: Record<string, string>): ProjectMeta {
	return {
		name: "test-project",
		packageManager: "npm",
		dependencies: deps,
		devDependencies: devDeps ?? {},
		scripts: {},
	}
}

describe("detectTechStack", () => {
	it("detects Next.js + Tailwind stack", () => {
		const meta = makeMeta(
			{ react: "^19.0.0", "react-dom": "^19.0.0", next: "^15.0.0" },
			{ tailwindcss: "^4.0.0", typescript: "^5.0.0" },
		)

		const result = detectTechStack(meta)

		expect(result.framework.value).toBe("Next.js")
		expect(result.framework.confidence).toBe("high")
		expect(result.styling.value.approach).toBe("Tailwind CSS")
		expect(result.styling.value.tier).toBe(1)
	})

	it("detects Vue + SCSS", () => {
		const meta = makeMeta({ vue: "^3.0.0" }, { sass: "^1.0.0" })

		const result = detectTechStack(meta)

		expect(result.framework.value).toBe("Vue")
		expect(result.styling.value.approach).toBe("SCSS")
		expect(result.styling.value.tier).toBe(2)
	})

	it("detects state management libraries", () => {
		const meta = makeMeta({ react: "^19.0.0", zustand: "^5.0.0" })

		const result = detectTechStack(meta)

		expect(result.stateManagement?.value).toBe("Zustand")
	})

	it("detects UI libraries", () => {
		const meta = makeMeta({
			react: "^19.0.0",
			"@radix-ui/react-dialog": "^1.0.0",
		})

		const result = detectTechStack(meta)

		expect(result.uiLibrary?.value).toBe("shadcn/ui")
	})

	it("detects TypeScript when in devDependencies", () => {
		const meta = makeMeta({ react: "^19.0.0" }, { typescript: "^5.0.0" })

		const result = detectTechStack(meta)

		expect(result.language.value).toBe("TypeScript")
	})

	it("defaults to JavaScript when no typescript dep", () => {
		const meta = makeMeta({ react: "^19.0.0" })

		const result = detectTechStack(meta)

		expect(result.language.value).toBe("JavaScript")
	})

	it("detects Vite as build tool", () => {
		const meta = makeMeta({ react: "^19.0.0" }, { vite: "^6.0.0" })

		const result = detectTechStack(meta)

		expect(result.buildTool?.value).toBe("Vite")
	})
})
