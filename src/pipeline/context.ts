import { resolve } from "node:path"
import type { DittoConfig } from "@defs/config.js"
import type { PipelineContext } from "@defs/pipeline.js"
import type { ILLMClient } from "@llm/client.js"
import { LLMClient } from "@llm/client.js"
import { UsageTracker } from "@llm/usage.js"
import { extractProjectName, resolveOutputDir } from "@utils/path.js"

export function createPipelineContext(
	source: string,
	resolvedPath: string,
	config: DittoConfig,
	overrides?: { llmClient?: ILLMClient; usage?: UsageTracker },
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
		llmClient: overrides?.llmClient ?? new LLMClient(config),
		usage: overrides?.usage ?? new UsageTracker(),
	}
}
