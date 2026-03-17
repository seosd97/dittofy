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
			"Token definition file (e.g., src/styles/tokens.css)",
			"Global base styles file (CSS reset, body defaults, selection styles)",
			"Font files loaded and accessible",
			"Component directories: layout/ for structural components, ui/ for reusable elements",
		],
		expects: [],
		scanInstructions: [],
	},

	"design-tokens": {
		produces: [
			"Color tokens with semantic names (surfaces, text, borders, accents) in the token file",
			"Spacing scale in the token file",
			"Border radius tiers in the token file",
			"Shadow/elevation levels in the token file",
			"Z-index scale (if relevant) in the token file",
			"Breakpoint values for responsive design in the token file",
			"Transition/animation tokens (durations, easing functions) in the token file",
			"Styling config updated (e.g., tailwind.config theme.extend) if applicable",
		],
		expects: [
			"Token file created in setup step (e.g., src/styles/tokens.css)",
			"Styling config file if applicable (e.g., tailwind.config.ts)",
		],
		scanInstructions: [
			"Find the token file created in setup (e.g., src/styles/tokens.css)",
			"Find the styling config if applicable (e.g., tailwind.config.ts)",
			"Read existing token values and naming conventions to extend consistently",
		],
	},

	typography: {
		produces: [
			"Font family declarations with fallback stacks in the token file",
			"Complete type scale (heading, body, caption sizes with line-height and weight)",
			"Font weight scale with semantic names",
			"Typography utility classes or mixins (if applicable)",
		],
		expects: [
			"Token file with color/spacing/shadow tokens from previous steps",
			"Font files loaded in setup step",
		],
		scanInstructions: [
			"Find the token file and read existing tokens to extend with typography values",
			"Check if fonts were loaded in setup (layout file, CSS imports, etc.)",
			"Find the styling config to extend with typography values",
		],
	},

	"layout-shell": {
		produces: [
			"Header component in components/layout/",
			"Footer component in components/layout/",
			"Navigation component in components/layout/",
			"PageContainer component in components/layout/ (max-width, padding, centering)",
			"Root layout file updated with header + footer + page container shell",
		],
		expects: [
			"Token file with spacing and color tokens",
			"Typography system from previous step",
			"components/layout/ directory from setup step",
		],
		scanInstructions: [
			"Find the token file to use correct spacing and color values",
			"Find typography definitions to use correct text styles in header/nav",
			"Find the root layout file to integrate the shell into",
			"Find the components/layout/ directory for placing layout components",
		],
	},

	"showcase-pages": {
		produces: [
			"Home page with hero, feature sections, and CTA",
			"About page with content sections demonstrating typography and spacing",
			"Button component in components/ui/",
			"Card component in components/ui/",
			"Section container component in components/ui/",
		],
		expects: [
			"Token file with all design tokens",
			"Typography system",
			"Layout shell components (Header, Footer, Navigation, PageContainer)",
			"components/ui/ directory for reusable elements",
		],
		scanInstructions: [
			"Find and read the token file to use exact token values",
			"Find and read the typography definitions",
			"Find the layout shell components and understand how to slot page content",
			"Find the pages/routes directory and the project's page creation convention",
			"Find the components/ui/ directory for placing reusable components",
		],
	},

	responsive: {
		produces: [
			"Responsive breakpoints applied to layout shell components",
			"Home and About pages adapted for mobile, tablet, and desktop",
			"Typography scaling across breakpoints",
			"Navigation responsive behavior (mobile menu, hamburger, etc.)",
		],
		expects: [
			"Token file with breakpoint values",
			"Home and About pages from previous step",
			"Layout shell components (Header, Footer, Navigation, PageContainer)",
		],
		scanInstructions: [
			"Find breakpoint definitions in the token/config files",
			"Read the layout shell components to understand current structure",
			"Read the Home and About pages to understand current layout",
			"Identify the project's responsive approach (media queries, container queries, utility classes)",
		],
	},

	interactions: {
		produces: [
			"Hover/active/focus states on Button, Card, and link elements",
			"Page entrance animations or scroll-based effects on Home and About pages",
			"Transition values applied to state changes",
			"Navigation interaction states",
		],
		expects: [
			"Home and About pages with interactive elements",
			"Button and Card components in components/ui/",
			"Token file for transition durations and easings (if defined)",
		],
		scanInstructions: [
			"Read the Home and About pages to find elements needing interaction states",
			"Read Button and Card components in components/ui/",
			"Check if transition/animation tokens exist in the token file",
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
