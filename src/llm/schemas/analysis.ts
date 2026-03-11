import { z } from "zod"
import { confidenceLevelSchema, confident } from "./common.js"

export const colorTokenSchema = z.object({
	name: z.string(),
	value: z.string().describe("hex, rgb, or hsl"),
	usage: z.string().describe("How this color is used in the design"),
	confidence: confidenceLevelSchema,
})

export const spacingTokenSchema = z.object({
	name: z.string(),
	value: z.string(),
	usage: z.string().describe("Where this spacing is commonly used"),
	confidence: confidenceLevelSchema,
})

export const tokenValueSchema = z.object({
	name: z.string(),
	value: z.string(),
	confidence: confidenceLevelSchema,
})

export const designTokensSchema = z.object({
	colors: z.array(colorTokenSchema),
	spacing: z.array(spacingTokenSchema),
	borderRadius: z.array(tokenValueSchema),
	shadows: z.array(tokenValueSchema),
	breakpoints: z.array(tokenValueSchema),
	zIndex: z.array(tokenValueSchema),
})

export const typographyScaleSchema = z.object({
	name: z.string(),
	fontSize: z.string(),
	lineHeight: z.string().optional(),
	fontWeight: z.string().optional(),
	usage: z.string().describe("Where this scale is used"),
	confidence: confidenceLevelSchema,
})

export const typographySystemSchema = z.object({
	fontFamilies: confident(z.array(z.string())),
	scale: z.array(typographyScaleSchema),
	lineHeights: z.array(tokenValueSchema),
	fontWeights: z.array(tokenValueSchema),
})

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
	approach: confident(z.string()),
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
