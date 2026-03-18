import { confidenceLevelSchema } from "@llm/schemas/common.js"
import { consistencyMetricsSchema } from "@llm/schemas/consistency.js"
import { z } from "zod"

export const propInfoSchema = z.object({
	name: z.string(),
	type: z.string(),
	required: z.boolean(),
	defaultValue: z.string().optional(),
})

export const variantSpecSchema = z.object({
	name: z.string(),
	description: z.string(),
	visualDiff: z.string().optional().describe("How this variant looks different from default"),
})

export const componentStateSchema = z.object({
	name: z.enum(["default", "hover", "active", "focus", "disabled", "loading", "error"]),
	description: z.string(),
})

export const sizeSpecSchema = z.object({
	name: z.string().describe("e.g., sm, md, lg"),
	dimensions: z.string().optional().describe("Approximate size values"),
})

export const accessibilityInfoSchema = z.object({
	role: z.string().optional().describe("ARIA role"),
	keyboardInteraction: z.string().optional(),
	screenReaderNotes: z.string().optional(),
})

export const componentTokenBindingSchema = z.object({
	tokenCategory: z.string().describe("e.g., colors, spacing, borderRadius"),
	tokenNames: z.array(z.string()).describe("Token names used by this component"),
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
	variantSpecs: z.array(variantSpecSchema).optional(),
	states: z.array(componentStateSchema).optional(),
	sizes: z.array(sizeSpecSchema).optional(),
	accessibility: accessibilityInfoSchema.optional(),
	tokenBindings: z.array(componentTokenBindingSchema).optional(),
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
	consistency: consistencyMetricsSchema.optional(),
})