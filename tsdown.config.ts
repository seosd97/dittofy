import { resolve } from "node:path"
import { defineConfig } from "tsdown"

export default defineConfig({
	entry: {
		cli: "src/app/cli/index.ts",
		index: "src/index.ts",
	},
	format: ["esm"],
	dts: true,
	clean: true,
	alias: {
		"@infra": resolve(__dirname, "src/infra"),
		"@domain": resolve(__dirname, "src/domain"),
		"@app": resolve(__dirname, "src/app"),
		"@defs": resolve(__dirname, "src/domain/types"),
	},
})
