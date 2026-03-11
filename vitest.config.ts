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
			"@aspects": resolve(__dirname, "src/aspects"),
			"@llm": resolve(__dirname, "src/llm"),
			"@source": resolve(__dirname, "src/source"),
			"@output": resolve(__dirname, "src/output"),
			"@pipeline": resolve(__dirname, "src/pipeline"),
			"@cli": resolve(__dirname, "src/cli"),
			"@config": resolve(__dirname, "src/config"),
			"@defs": resolve(__dirname, "src/types"),
			"@utils": resolve(__dirname, "src/utils"),
		},
	},
})
