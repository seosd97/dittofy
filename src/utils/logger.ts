import { createConsola } from "consola"

export const logger = createConsola({
	formatOptions: {
		date: false,
		colors: true,
	},
})

export function setDebugMode(enabled: boolean) {
	logger.level = enabled ? 5 : 3
}

export function phaseStart(phase: string, description: string) {
	logger.start(`[${phase}] ${description}`)
}

export function phaseSuccess(phase: string, description: string) {
	logger.success(`[${phase}] ${description}`)
}

export function phaseFail(phase: string, description: string) {
	logger.error(`[${phase}] ${description}`)
}

export function phaseWarn(phase: string, description: string) {
	logger.warn(`[${phase}] ${description}`)
}
