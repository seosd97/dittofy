#!/usr/bin/env node
import { defineCommand, runMain } from "citty"
import { analyzeCommand } from "./commands/analyze.js"
import { configCommand } from "./commands/config.js"
import { generateCommand } from "./commands/generate.js"
import { initCommand } from "./commands/init.js"

const main = defineCommand({
	meta: {
		name: "dittofy",
		version: "0.1.0",
		description:
			"Analyze FE repositories to extract design essence and generate AI coding agent prompts",
	},
	subCommands: {
		analyze: analyzeCommand,
		generate: generateCommand,
		config: configCommand,
		init: initCommand,
	},
})

runMain(main)
