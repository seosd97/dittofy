import type { StepType } from "@defs/prompts.js"

export interface StepContract {
	/** What this step produces — artifacts the next steps can rely on */
	produces: string[]
	/** What this step expects to find from previous steps */
	expects: string[]
	/** Scan instructions for the agent before starting this step */
	scanInstructions: string[]
}

const STEP_CONTRACTS: Record<StepType, StepContract> = {
	setup: {
		produces: [
			"Project with framework, build tool, and styling approach configured",
			"Design token infrastructure (file/config where tokens will be defined)",
			"Global base styles (CSS reset, body defaults, selection styles)",
			"Font files loaded and accessible",
			"Folder structure for the design system",
		],
		expects: [],
		scanInstructions: [],
	},

	"design-tokens": {
		produces: [
			"All color tokens defined with semantic names (surfaces, text, borders, accents, semantic)",
			"Spacing scale defined",
			"Border radius tiers defined",
			"Shadow/elevation levels defined",
			"Z-index scale defined (if relevant)",
			"Tokens accessible to all components via the project's styling approach",
		],
		expects: [
			"Token infrastructure created in the setup step",
		],
		scanInstructions: [
			"Find where the token infrastructure was set up (e.g., tailwind.config, CSS variables file, theme object)",
			"Identify the naming convention used for existing tokens (if any)",
			"Read the project's styling configuration to understand the token format",
		],
	},

	typography: {
		produces: [
			"Font family declarations with fallback stacks",
			"Complete type scale (heading, body, caption sizes with line-height and weight)",
			"Font weight scale with semantic names",
			"Typography utility classes or mixins (if applicable)",
		],
		expects: [
			"Token infrastructure and design tokens (colors, spacing, shadows, border-radius) from previous steps",
			"Font files loaded in the setup step",
		],
		scanInstructions: [
			"Find where design tokens are defined and how to extend them with typography tokens",
			"Check if fonts were loaded in the setup step (layout file, CSS imports, etc.)",
			"Identify the project's convention for defining text styles",
		],
	},

	"layout-shell": {
		produces: [
			"Page container component/layout with max-width, padding, and centering",
			"Grid system primitives (column structure, gap values)",
			"Navigation shell structure (header, sidebar, or top-nav skeleton)",
			"Header/footer area components with correct dimensions",
			"Page wrapper that slots individual page content into the shell",
		],
		expects: [
			"Design tokens (spacing, colors) from previous steps",
			"Typography system from previous step",
		],
		scanInstructions: [
			"Find the design token definitions to use correct spacing and color values",
			"Find the typography definitions to use correct text styles in navigation/header",
			"Identify the project's routing approach (e.g., app router, pages router) to place layouts correctly",
		],
	},

	"showcase-pages": {
		produces: [
			"Home page (/) with hero, feature sections, and CTA — demonstrating the design system",
			"About page (/about) with content sections — demonstrating typography and spacing",
			"Simple inline components created as needed (buttons, cards, section containers)",
		],
		expects: [
			"Design tokens (colors, spacing, shadows, radius) from previous steps",
			"Typography system (type scale, font families) from previous steps",
			"Layout shell (page container, grid, navigation) from previous step",
		],
		scanInstructions: [
			"Find and read the design token definitions to use exact values",
			"Find and read the typography definitions to use correct text styles",
			"Find the layout shell component(s) and understand how to slot page content into them",
			"Identify the project's page/route creation convention",
		],
	},

	responsive: {
		produces: [
			"Responsive breakpoints applied to the layout shell",
			"Showcase pages adapted for mobile, tablet, and desktop viewports",
			"Typography scaling across breakpoints",
			"Responsive spacing adjustments",
		],
		expects: [
			"Design tokens including breakpoint values from previous steps",
			"Showcase pages (Home, About) from previous step",
			"Layout shell (grid, containers) from previous step",
		],
		scanInstructions: [
			"Find the breakpoint definitions in the token/config files",
			"Read the showcase pages to understand their current structure",
			"Read the layout shell to understand the current grid/container approach",
			"Identify the project's responsive approach (media queries, container queries, utility classes)",
		],
	},

	interactions: {
		produces: [
			"Hover/active/focus states on interactive elements (buttons, links, cards)",
			"Page entrance animations or scroll-based effects",
			"Transition values applied to state changes",
			"Micro-interactions on design system elements",
		],
		expects: [
			"Showcase pages (Home, About) with interactive elements from previous step",
			"Design tokens for transition durations and easings (if defined)",
		],
		scanInstructions: [
			"Read the showcase pages to find elements that need interaction states",
			"Check if transition/animation tokens exist in the token definitions",
			"Identify the project's approach for animations (CSS transitions, animation library, etc.)",
		],
	},
}

export function getStepContract(stepType: StepType): StepContract {
	return STEP_CONTRACTS[stepType]
}

/**
 * Builds the contract section text to inject into prompts.
 * This tells the agent what to scan before starting and what to produce.
 */
export function buildContractSection(
	stepType: StepType,
	dependencies: number[],
	stepTitles: Map<number, string>,
): string {
	const contract = STEP_CONTRACTS[stepType]
	const lines: string[] = []

	// Prerequisites with scan instructions
	if (dependencies.length > 0) {
		const depNames = dependencies
			.map((num) => {
				const title = stepTitles.get(num)
				return title ? `Step ${num} (${title})` : `Step ${num}`
			})
			.join(", ")
		lines.push(`Complete ${depNames} before starting this step.`)
	} else {
		lines.push("No prerequisites. This is the first step.")
	}

	if (contract.scanInstructions.length > 0) {
		lines.push("")
		lines.push("**Before writing any code**, scan the working directory to understand the current state:")
		for (const instruction of contract.scanInstructions) {
			lines.push(`- ${instruction}`)
		}
		lines.push("")
		lines.push("Build on the existing implementation. Do NOT recreate or duplicate what previous steps already created.")
	}

	if (contract.expects.length > 0) {
		lines.push("")
		lines.push("**This step expects the following to already exist:**")
		for (const expectation of contract.expects) {
			lines.push(`- ${expectation}`)
		}
	}

	return lines.join("\n")
}

/**
 * Builds the artifacts section for Expected Outcome.
 * Tells the agent what must exist after completing this step.
 */
export function buildArtifactsSection(stepType: StepType): string {
	const contract = STEP_CONTRACTS[stepType]
	const lines: string[] = []

	lines.push("After completing this step, the following must exist in the project:")
	for (const artifact of contract.produces) {
		lines.push(`- ${artifact}`)
	}

	return lines.join("\n")
}
