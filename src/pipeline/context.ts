import { resolve } from "node:path"
import type { DittoConfig } from "@defs/config.js"
import type { PipelineContext } from "@defs/pipeline.js"
import { extractProjectName, resolveOutputDir } from "@utils/path.js"

export function createPipelineContext(
	source: string,
	resolvedPath: string,
	config: DittoConfig,
): PipelineContext {
	const projectName = extractProjectName(source)
	const outputDir = resolveOutputDir(resolve(config.output), projectName)

	return {
		config,
		source,
		resolvedPath,
		projectName,
		outputDir,
		startTime: Date.now(),
	}
}
