import { consistencyMetricsSchema, designNotesSchema } from "@defs/schema-utils.js"
import { z } from "zod"

const variantSpecSchema = z.object({
	name: z.string(),
	description: z.string(),
	visualDiff: z
		.string()
		.nullable()
		.optional()
		.describe("How this variant looks different from default"),
})

const componentStateSchema = z.object({
	name: z
		.string()
		.describe(
			"UI state name (e.g., default, hover, active, focus, disabled, loading, error, empty, selected, open, collapsed)",
		),
	description: z.string(),
})

const accessibilityInfoSchema = z.object({
	role: z.string().nullable().optional().describe("ARIA role"),
	keyboardInteraction: z.string().nullable().optional(),
	screenReaderNotes: z.string().nullable().optional(),
})

export const componentInfoSchema = z.object({
	name: z.string(),
	category: z.enum(["atom", "molecule", "organism", "template"]),
	tier: z
		.enum(["core", "design-system", "domain"])
		.describe(
			"'core' for fundamental UI primitives needed in virtually any project (Button, Input, Textarea, Checkbox, Radio, Select, Badge, Separator, Label). 'design-system' for common but optional UI components (Dialog, Tooltip, Tabs, Avatar, Menu, Dropdown, Card, Accordion, etc.). 'domain' for app-specific business components tied to the source project's features (LoginCard, ProjectGrid, MemberList, DeploymentList, etc.).",
		),
	variants: z.array(z.string()),
	description: z.string().describe("Visual character and design intent"),
	variantSpecs: z.array(variantSpecSchema).nullable().optional(),
	states: z.array(componentStateSchema).nullable().optional(),
	sizes: z.array(z.string()).nullable().optional(),
	accessibility: accessibilityInfoSchema.nullable().optional(),
})

export const componentPatternSchema = z.object({
	name: z.string(),
	description: z.string(),
	components: z.array(z.string()),
})

export const componentCatalogSchema = z.object({
	components: z.array(componentInfoSchema),
	patterns: z.array(componentPatternSchema),
	consistency: consistencyMetricsSchema.nullable().optional(),
	designNotes: designNotesSchema,
})

export type ComponentCatalog = z.infer<typeof componentCatalogSchema>
