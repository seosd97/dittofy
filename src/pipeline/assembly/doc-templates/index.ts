import type { AspectName } from "@defs/aspect-map.js"
import type { DocTemplate } from "@defs/templates.js"
import { renderTokensDoc } from "./tokens-doc.js"
import { renderTypographyDoc } from "./typography-doc.js"
import { renderComponentsDoc } from "./components-doc.js"
import { renderLayoutDoc } from "./layout-doc.js"
import { renderPagesDoc } from "./pages-doc.js"
import { renderResponsiveDoc } from "./responsive-doc.js"
import { renderInteractionsDoc } from "./interactions-doc.js"

export interface DocTemplateEntry {
	filename: string
	title: string
	category: "core" | "dynamic"
	template: DocTemplate
}

export const DOC_TEMPLATES: Partial<Record<AspectName, DocTemplateEntry>> = {
	designTokens: {
		filename: "01-design-tokens.md",
		title: "Design Tokens",
		category: "core",
		template: renderTokensDoc,
	},
	typography: {
		filename: "02-typography.md",
		title: "Typography",
		category: "core",
		template: renderTypographyDoc,
	},
	componentCatalog: {
		filename: "03-component-catalog.md",
		title: "Component Catalog",
		category: "core",
		template: renderComponentsDoc,
	},
	layoutSystem: {
		filename: "04-layout-system.md",
		title: "Layout System",
		category: "core",
		template: renderLayoutDoc,
	},
	pageStructures: {
		filename: "05-page-structures.md",
		title: "Page Structures",
		category: "dynamic",
		template: renderPagesDoc,
	},
	responsiveStrategy: {
		filename: "06-responsive-strategy.md",
		title: "Responsive Strategy",
		category: "dynamic",
		template: renderResponsiveDoc,
	},
	interactionPatterns: {
		filename: "07-interactions.md",
		title: "Interactions",
		category: "dynamic",
		template: renderInteractionsDoc,
	},
}
