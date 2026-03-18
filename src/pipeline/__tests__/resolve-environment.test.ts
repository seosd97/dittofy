import { describe, expect, it } from "vitest"
import type { TechStack } from "@defs/analysis.js"
import {
	buildEnvironmentSection,
	resolveEnvironment,
} from "@pipeline/assembly/resolve-environment.js"

function createTechStack(overrides: Partial<TechStack> = {}): TechStack {
	return {
		framework: { value: "Next.js", confidence: "high" },
		language: { value: "TypeScript", confidence: "high" },
		styling: { value: { approach: "Tailwind CSS", tier: 1 }, confidence: "high" },
		buildTool: { value: "Vite", confidence: "high" },
		uiLibrary: { value: "shadcn/ui", confidence: "high" },
		...overrides,
	}
}

describe("resolveEnvironment", () => {
	it("detects existing-project when framework is confident", () => {
		const env = resolveEnvironment(createTechStack())
		expect(env.mode).toBe("existing-project")
		expect(env.framework).toBe("Next.js")
		expect(env.language).toBe("TypeScript")
		expect(env.styling).toBe("Tailwind CSS")
		expect(env.buildTool).toBe("Vite")
		expect(env.uiLibrary).toBe("shadcn/ui")
	})

	it("detects greenfield when framework is Unknown", () => {
		const env = resolveEnvironment(
			createTechStack({
				framework: { value: "Unknown", confidence: "low" },
			}),
		)
		expect(env.mode).toBe("greenfield")
	})

	it("detects greenfield when framework confidence is low", () => {
		const env = resolveEnvironment(
			createTechStack({
				framework: { value: "React", confidence: "low" },
			}),
		)
		expect(env.mode).toBe("greenfield")
	})

	it("resolves Tailwind token strategy", () => {
		const env = resolveEnvironment(createTechStack())
		expect(env.tokenStrategy).toContain("tailwind.config")
	})

	it("resolves CSS variables token strategy for SCSS", () => {
		const env = resolveEnvironment(
			createTechStack({
				styling: { value: { approach: "SCSS", tier: 2 }, confidence: "high" },
			}),
		)
		expect(env.tokenStrategy).toContain("CSS custom properties")
	})

	it("resolves theme object token strategy for Styled Components", () => {
		const env = resolveEnvironment(
			createTechStack({
				styling: { value: { approach: "Styled Components", tier: 2 }, confidence: "high" },
			}),
		)
		expect(env.tokenStrategy).toContain("theme object")
	})

	it("resolves Vanilla Extract token strategy", () => {
		const env = resolveEnvironment(
			createTechStack({
				styling: { value: { approach: "Vanilla Extract", tier: 2 }, confidence: "high" },
			}),
		)
		expect(env.tokenStrategy).toContain("createThemeContract")
	})

	it("handles missing optional fields", () => {
		const env = resolveEnvironment(
			createTechStack({
				buildTool: undefined,
				uiLibrary: undefined,
			}),
		)
		expect(env.buildTool).toBeNull()
		expect(env.uiLibrary).toBeNull()
	})

	it("summary includes stack info for existing-project", () => {
		const env = resolveEnvironment(createTechStack())
		expect(env.summary).toContain("Existing project")
		expect(env.summary).toContain("Next.js")
		expect(env.summary).toContain("Tailwind CSS")
	})

	it("summary is generic for greenfield", () => {
		const env = resolveEnvironment(
			createTechStack({
				framework: { value: "Unknown", confidence: "low" },
			}),
		)
		expect(env.summary).toContain("New project")
	})
})

describe("buildEnvironmentSection", () => {
	it("returns stack-agnostic text for greenfield", () => {
		const env = resolveEnvironment(
			createTechStack({
				framework: { value: "Unknown", confidence: "low" },
			}),
		)
		const section = buildEnvironmentSection(env)
		expect(section).toContain("NEW project")
		expect(section).not.toContain("EXISTING environment")
	})

	it("returns stack-specific text for existing-project", () => {
		const env = resolveEnvironment(createTechStack())
		const section = buildEnvironmentSection(env)
		expect(section).toContain("EXISTING environment")
		expect(section).toContain("Next.js")
		expect(section).toContain("Tailwind CSS")
		expect(section).toContain("Token Strategy")
	})

	it("omits build tool when null", () => {
		const env = resolveEnvironment(
			createTechStack({
				buildTool: undefined,
			}),
		)
		const section = buildEnvironmentSection(env)
		expect(section).not.toContain("Build Tool")
	})

	it("omits UI library when null", () => {
		const env = resolveEnvironment(
			createTechStack({
				uiLibrary: undefined,
			}),
		)
		const section = buildEnvironmentSection(env)
		expect(section).not.toContain("UI Library")
	})
})
