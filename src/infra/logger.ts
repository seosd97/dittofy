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

export function isDebugMode(): boolean {
	return logger.level >= 5
}

const phaseTimers = new Map<string, number>()

function formatElapsed(startTime: number): string {
	const elapsed = (Date.now() - startTime) / 1000
	return `[${elapsed.toFixed(1)}s]`
}

export function phaseStart(phase: string, description: string) {
	phaseTimers.set(phase, Date.now())
	logger.start(`[${phase}] ${description}`)
}

export function phaseSuccess(phase: string, description: string) {
	const startTime = phaseTimers.get(phase)
	const elapsed = startTime ? ` ${formatElapsed(startTime)}` : ""
	phaseTimers.delete(phase)
	logger.success(`[${phase}] ${description}${elapsed}`)
}

export function phaseFail(phase: string, description: string) {
	const startTime = phaseTimers.get(phase)
	const elapsed = startTime ? ` ${formatElapsed(startTime)}` : ""
	phaseTimers.delete(phase)
	logger.error(`[${phase}] ${description}${elapsed}`)
}

export function phaseWarn(phase: string, description: string) {
	logger.warn(`[${phase}] ${description}`)
}
