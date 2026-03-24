import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		include: ["src/**/__tests__/**/*.test.ts"],
		environment: "node",
		testTimeout: 10_000,
	},
	resolve: {
		alias: {
			"@infra": resolve(__dirname, "src/infra"),
			"@domain": resolve(__dirname, "src/domain"),
			"@app": resolve(__dirname, "src/app"),
			"@defs": resolve(__dirname, "src/domain/types"),
		},
	},
})
