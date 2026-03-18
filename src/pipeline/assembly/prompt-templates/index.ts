import type { StepType } from "@defs/prompts.js"
import type { PromptTemplate } from "@defs/templates.js"
import { renderDesignTokensPrompt } from "./design-tokens-prompt.js"
import { renderInteractionsPrompt } from "./interactions-prompt.js"
import { renderLayoutShellPrompt } from "./layout-shell-prompt.js"
import { renderResponsivePrompt } from "./responsive-prompt.js"
import { renderSetupPrompt } from "./setup-prompt.js"
import { renderShowcasePagesPrompt } from "./showcase-pages-prompt.js"
import { renderTypographyPrompt } from "./typography-prompt.js"

export const PROMPT_TEMPLATES: Record<StepType, PromptTemplate> = {
	setup: renderSetupPrompt,
	"design-tokens": renderDesignTokensPrompt,
	typography: renderTypographyPrompt,
	"layout-shell": renderLayoutShellPrompt,
	"showcase-pages": renderShowcasePagesPrompt,
	responsive: renderResponsivePrompt,
	interactions: renderInteractionsPrompt,
}
