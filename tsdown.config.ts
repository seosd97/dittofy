import { resolve } from "node:path"
import { defineConfig } from "tsdown"

const root = import.meta.dirname

export default defineConfig({
	entry: {
		cli: "src/app/cli/index.ts",
		index: "src/index.ts",
	},
	format: ["esm"],
	dts: true,
	clean: true,
	alias: {
		"@infra": resolve(root, "src/infra"),
		"@domain": resolve(root, "src/domain"),
		"@app": resolve(root, "src/app"),
		"@defs": resolve(root, "src/domain/types"),
	},
})
