import { confidenceLevelSchema } from "@llm/schemas/common.js"
import { z } from "zod"

export const propInfoSchema = z.object({
	name: z.string(),
	type: z.string(),
	required: z.boolean(),
	defaultValue: z.string().optional(),
})

export const componentInfoSchema = z.object({
	name: z.string(),
	filePath: z.string().describe("Relative to project root"),
	category: z.enum(["atom", "molecule", "organism", "template"]),
	tier: z
		.enum(["core", "design-system", "domain"])
		.describe(
			"'core' for fundamental UI primitives needed in virtually any project (Button, Input, Textarea, Checkbox, Radio, Select, Badge, Separator, Label). 'design-system' for common but optional UI components (Dialog, Tooltip, Tabs, Avatar, Menu, Dropdown, Card, Accordion, etc.). 'domain' for app-specific business components tied to the source project's features (LoginCard, ProjectGrid, MemberList, DeploymentList, etc.).",
		),
	props: z.array(propInfoSchema),
	variants: z.array(z.string()),
	description: z.string().describe("Visual character and design intent"),
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
