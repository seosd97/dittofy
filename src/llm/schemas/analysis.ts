import { z } from "zod"
import { confidenceLevelSchema, confident } from "./common.js"

export const colorTokenSchema = z.object({
	name: z.string().describe("Token name, e.g. 'primary', 'gray-500'"),
	value: z.string().describe("Color value in hex, rgb, or hsl"),
	usage: z.string().describe("How this color is used in the design"),
	confidence: confidenceLevelSchema,
})

export const spacingTokenSchema = z.object({
	name: z.string().describe("Token name, e.g. 'sm', 'md', 'lg' or '4', '8', '16'"),
	value: z.string().describe("Spacing value, e.g. '0.5rem', '8px'"),
	usage: z.string().describe("Where this spacing is commonly used"),
	confidence: confidenceLevelSchema,
})

export const tokenValueSchema = z.object({
	name: z.string(),
	value: z.string(),
	confidence: confidenceLevelSchema,
})

export const designTokensSchema = z.object({
	colors: z.array(colorTokenSchema).describe("Color palette tokens"),
	spacing: z.array(spacingTokenSchema).describe("Spacing scale tokens"),
	borderRadius: z.array(tokenValueSchema).describe("Border radius tokens"),
	shadows: z.array(tokenValueSchema).describe("Box shadow tokens"),
	breakpoints: z.array(tokenValueSchema).describe("Responsive breakpoints"),
	zIndex: z.array(tokenValueSchema).describe("Z-index scale"),
})

export const typographyScaleSchema = z.object({
	name: z.string().describe("Scale name, e.g. 'h1', 'body', 'caption'"),
	fontSize: z.string().describe("Font size value"),
	lineHeight: z.string().optional().describe("Line height"),
	fontWeight: z.string().optional().describe("Font weight"),
	usage: z.string().describe("Where this scale is used"),
	confidence: confidenceLevelSchema,
})

export const typographySystemSchema = z.object({
	fontFamilies: confident(z.array(z.string())).describe("Font families used"),
	scale: z.array(typographyScaleSchema).describe("Typography scale system"),
	lineHeights: z.array(tokenValueSchema).describe("Line height tokens"),
	fontWeights: z.array(tokenValueSchema).describe("Font weight tokens"),
})

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

export const layoutContainerSchema = z.object({
	name: z.string(),
	maxWidth: z.string().optional(),
	padding: z.string().optional(),
	confidence: confidenceLevelSchema,
})

export const gridSystemSchema = z.object({
	type: z.enum(["css-grid", "flexbox", "both"]),
	columns: z.number().optional(),
	gap: z.string().optional(),
	confidence: confidenceLevelSchema,
})

export const navigationPatternSchema = z.object({
	type: z.string(),
	description: z.string(),
	confidence: confidenceLevelSchema,
})

export const layoutSystemSchema = z.object({
	approach: confident(z.string()).describe("Overall layout approach"),
	containers: z.array(layoutContainerSchema),
	grids: z.array(gridSystemSchema),
	navigation: z.array(navigationPatternSchema),
})

export const pageInfoSchema = z.object({
	name: z.string(),
	route: z.string(),
	layout: z.string(),
	sections: z.array(z.string()),
	components: z.array(z.string()),
	confidence: confidenceLevelSchema,
})

export const pageStructuresSchema = z.object({
	pages: z.array(pageInfoSchema),
})

export const breakpointInfoSchema = z.object({
	name: z.string(),
	value: z.string(),
	confidence: confidenceLevelSchema,
})

export const responsivePatternSchema = z.object({
	name: z.string(),
	description: z.string(),
	breakpoint: z.string(),
	confidence: confidenceLevelSchema,
})

export const responsiveStrategySchema = z.object({
	approach: confident(z.string()).describe("mobile-first or desktop-first"),
	breakpoints: z.array(breakpointInfoSchema),
	patterns: z.array(responsivePatternSchema),
})

export const animationInfoSchema = z.object({
	name: z.string(),
	type: z.string(),
	description: z.string(),
	confidence: confidenceLevelSchema,
})

export const transitionInfoSchema = z.object({
	property: z.string(),
	duration: z.string(),
	easing: z.string(),
	confidence: confidenceLevelSchema,
})

export const gestureInfoSchema = z.object({
	type: z.string(),
	description: z.string(),
	confidence: confidenceLevelSchema,
})

export const interactionPatternsSchema = z.object({
	animations: z.array(animationInfoSchema),
	transitions: z.array(transitionInfoSchema),
	gestures: z.array(gestureInfoSchema),
})

export const designEssenceSchema = z.object({
	summary: z.string().describe("One-line summary of the design identity"),
	designPhilosophy: z.string().describe("Core design philosophy in 2-3 sentences"),
	keyCharacteristics: z.array(z.string()).describe("3-5 key visual characteristics"),
	colorStrategy: z.string().describe("Color usage strategy"),
	typographyStrategy: z.string().describe("Typography approach"),
	layoutStrategy: z.string().describe("Layout approach"),
	componentStrategy: z.string().describe("Component design approach"),
	interactionStrategy: z.string().describe("Interaction/motion approach"),
})
