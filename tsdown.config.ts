import { defineConfig } from "tsdown"

export default defineConfig({
	entry: {
		cli: "src/cli/index.ts",
		index: "src/index.ts",
	},
	format: ["esm"],
	dts: true,
	clean: true,
})
