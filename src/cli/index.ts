#!/usr/bin/env node
import { defineCommand, runMain } from "citty"
import { analyzeCommand } from "./commands/analyze.js"
import { configCommand } from "./commands/config.js"

const main = defineCommand({
	meta: {
		name: "ditto",
		version: "0.1.0",
		description:
			"Analyze FE repositories to extract design essence and generate AI coding agent prompts",
	},
	subCommands: {
		analyze: analyzeCommand,
		config: configCommand,
	},
})

runMain(main)
