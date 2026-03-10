import { z } from "zod"

export const documentSectionSchema = z.object({
	title: z.string().describe("Section heading"),
	content: z.string().describe("Markdown content for this section"),
})

export const overviewDocSchema = z.object({
	identity: z.string().default("").describe("Design identity section in markdown"),
	techStack: z.string().default("").describe("Tech stack overview section"),
	designPhilosophy: z.string().default("").describe("Design philosophy section"),
	keyCharacteristics: z.string().default("").describe("Key characteristics section"),
})

export const tokensDocSchema = z.object({
	colorPalette: z.string().default("").describe("Color palette section with tables and descriptions"),
	spacing: z.string().default("").describe("Spacing scale section"),
	borderRadius: z.string().default("").describe("Border radius section"),
	shadows: z.string().default("").describe("Shadow scale section"),
	otherTokens: z.string().default("").describe("Other design tokens section"),
})

export const typographyDocSchema = z.object({
	fontFamilies: z.string().default("").describe("Font families section"),
	typeScale: z.string().default("").describe("Type scale section with table"),
	principles: z.string().default("").describe("Typography principles section"),
})

export const componentsDocSchema = z.object({
	overview: z.string().default("").describe("Component catalog overview"),
	componentList: z.string().default("").describe("Detailed component list with variants and design notes"),
	patterns: z.string().default("").describe("Component composition patterns"),
})

export const layoutDocSchema = z.object({
	gridSystem: z.string().default("").describe("Grid system section"),
	containers: z.string().default("").describe("Container strategy section"),
	navigation: z.string().default("").describe("Navigation patterns section"),
	hierarchy: z.string().default("").describe("Visual hierarchy section"),
})

export const pagesDocSchema = z.object({
	overview: z.string().default("").describe("Pages overview"),
	pageDetails: z.string().default("").describe("Detailed page-by-page section breakdown"),
})

export const responsiveDocSchema = z.object({
	approach: z.string().default("").describe("Responsive approach section"),
	breakpoints: z.string().default("").describe("Breakpoints reference table"),
	patterns: z.string().default("").describe("Responsive patterns section"),
})

export const interactionsDocSchema = z.object({
	motionStyle: z.string().default("").describe("Overall motion style section"),
	animations: z.string().default("").describe("Animation patterns section"),
	transitions: z.string().default("").describe("Transition defaults section"),
	principles: z.string().default("").describe("Interaction design principles"),
})
