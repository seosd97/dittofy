import { confidenceLevelSchema } from "@llm/schemas/common.js"
import { z } from "zod"

export const propInfoSchema = z.object({
	name: z.string(),
	type: z.string(),
	required: z.boolean(),
	defaultValue: z.string().optional(),
})

export const componentInfoSchema = z.object({
	name: z.string().describe("Component name"),
	filePath: z.string().describe("File path relative to project root"),
	category: z.enum(["atom", "molecule", "organism", "template"]).describe("Atomic design category"),
	props: z.array(propInfoSchema).describe("Component props"),
	variants: z.array(z.string()).describe("Visual variants"),
	description: z.string().describe("Design description of this component"),
	confidence: confidenceLevelSchema,
})

export const componentPatternSchema = z.object({
	name: z.string(),
	description: z.string(),
	components: z.array(z.string()),
	confidence: confidenceLevelSchema,
})

export const componentCatalogSchema = z.object({
	components: z.array(componentInfoSchema),
	patterns: z.array(componentPatternSchema),
})

export const componentsDocSchema = z.object({
	overview: z.string().default("").describe("Component catalog overview"),
	componentList: z
		.string()
		.default("")
		.describe("Detailed component list with variants and design notes"),
	patterns: z.string().default("").describe("Component composition patterns"),
})
