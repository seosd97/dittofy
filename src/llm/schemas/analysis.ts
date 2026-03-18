import { z } from "zod"

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
