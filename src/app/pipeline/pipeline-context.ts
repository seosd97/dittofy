import { resolve } from "node:path"
import type { DittoConfig } from "@defs/config.js"
import { extractProjectName, resolveOutputDir } from "@domain/path-utils.js"
import type { ILLMClient } from "@infra/llm/client.js"
import { LLMClient } from "@infra/llm/client.js"
import { UsageTracker } from "@infra/llm/usage.js"

export interface PipelineContext {
	config: DittoConfig
	source: string
	resolvedPath: string
	projectName: string
	outputDir: string
	startTime: number
	llmClient: ILLMClient
	usage: UsageTracker
}

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
