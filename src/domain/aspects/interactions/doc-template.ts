import type { TemplateContext } from "@defs/templates.js"
import { mdTable, renderConsistency } from "@domain/rendering/format-utils.js"

export function renderInteractionsDoc(ctx: TemplateContext): string | null {
	const interactions = ctx.analysis.interactionPatterns
	if (!interactions) return null
	if (
		interactions.animations.length === 0 &&
		interactions.transitions.length === 0 &&
		interactions.gestures.length === 0
	) {
		return null
	}

	const lines: string[] = []
	lines.push("# Interactions\n")

	// Motion Style
	lines.push("## Motion Style\n")
	lines.push(ctx.analysis.essence.interactionStrategy)
	lines.push("")

	// Animations
	if (interactions.animations.length > 0) {
		lines.push("## Animations\n")
		for (const a of interactions.animations) {
			lines.push(`### ${a.name}\n`)
			lines.push(`- **Type:** ${a.type}`)
			lines.push(`- **Description:** ${a.description}`)
			if (a.duration) {
				lines.push(`- **Duration:** ${a.duration}`)
			}
			if (a.easing) {
				lines.push(`- **Easing:** ${a.easing}`)
			}
			if (a.trigger) {
				lines.push(`- **Trigger:** ${a.trigger}`)
			}
			lines.push("")
		}
	}

	// Transitions
	if (interactions.transitions.length > 0) {
		lines.push("## Transitions\n")
		lines.push(
			mdTable(
				["Property", "Duration", "Easing"],
				interactions.transitions.map((t) => [t.property, t.duration, t.easing]),
			),
		)
		lines.push("")
	}

	// Gestures
	if (interactions.gestures.length > 0) {
		lines.push("## Gestures\n")
		for (const g of interactions.gestures) {
			lines.push(`### ${g.type}\n`)
			lines.push(`- **Description:** ${g.description}`)
			if (g.triggerElement) {
				lines.push(`- **Trigger Element:** ${g.triggerElement}`)
			}
			if (g.feedbackType) {
				lines.push(`- **Feedback:** ${g.feedbackType}`)
			}
			lines.push("")
		}
	}

	// State Choreography
	if (interactions.choreography && interactions.choreography.length > 0) {
		lines.push("## State Choreography\n")
		for (const c of interactions.choreography) {
			lines.push(`### ${c.name}\n`)
			lines.push(c.description)
			lines.push("\n**Steps:**")
			for (let i = 0; i < c.steps.length; i++) {
				lines.push(`${i + 1}. ${c.steps[i]}`)
			}
			lines.push("")
		}
	}

	// Consistency Assessment
	if (interactions.consistency) {
		lines.push(renderConsistency(interactions.consistency))
		lines.push("")
	}

	return lines.join("\n")
}
