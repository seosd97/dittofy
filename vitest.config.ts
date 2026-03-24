import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

const root = import.meta.dirname

export default defineConfig({
	test: {
		include: ["src/**/__tests__/**/*.test.ts"],
		environment: "node",
		testTimeout: 10_000,
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			reportsDirectory: "coverage",
			include: ["src/**/*.ts"],
			exclude: ["src/**/__tests__/**", "src/**/index.ts"],
		},
	},
	resolve: {
		alias: {
			"@infra": resolve(root, "src/infra"),
			"@domain": resolve(root, "src/domain"),
			"@app": resolve(root, "src/app"),
			"@defs": resolve(root, "src/domain/types"),
		},
	},
})
