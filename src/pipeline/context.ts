import { resolve } from "node:path"
import type { DittoConfig } from "../types/config.js"
import type { PipelineContext } from "../types/pipeline.js"
import { extractProjectName, resolveOutputDir } from "../utils/path.js"

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
