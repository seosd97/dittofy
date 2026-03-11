import { readFile } from "node:fs/promises"
import { basename, join } from "node:path"
import type { ConfigFile } from "@defs/extraction.js"
import { logger } from "@utils/logger.js"

export async function extractConfigs(
	rootPath: string,
	configFilePaths: string[],
): Promise<ConfigFile[]> {
	const configs: ConfigFile[] = []

	for (const filePath of configFilePaths) {
		const fullPath = join(rootPath, filePath)
		try {
			const content = await readFile(fullPath, "utf-8")
			const name = basename(filePath)

			configs.push({
				name,
				filePath,
				content,
				type: classifyConfig(name),
			})
		} catch {
			logger.debug(`Failed to read config: ${filePath}`)
		}
	}

	return configs
}

function classifyConfig(filename: string): ConfigFile["type"] {
	if (filename.startsWith("tailwind.config")) return "tailwind"
	if (filename.startsWith("postcss.config")) return "postcss"
	if (filename === "tsconfig.json" || filename.startsWith("tsconfig.")) return "tsconfig"
	if (filename === "package.json") return "package"
	if (filename.startsWith("vite.config")) return "vite"
	if (filename.startsWith("next.config")) return "next"
	if (filename.startsWith("svelte.config")) return "svelte"
	if (filename.startsWith("astro.config")) return "astro"
	if (filename.startsWith("nuxt.config")) return "nuxt"
	return "other"
}
