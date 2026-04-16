import { logger } from "@infra/logger.js"

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
const SPINNER_INTERVAL_MS = 80

export interface ProgressTracker {
	start(totalWaves: number, totalAspects: number): void
	startWave(waveOrder: number, aspects: string[]): void
	startAspect(aspectName: string, displayName: string): void
	completeAspect(aspectName: string, displayName: string): void
	failAspect(aspectName: string, displayName: string, error: string): void
	completeWave(waveOrder: number, succeeded: number, total: number, elapsed: string): void
	done(succeeded: number, failed: number): void
}

function formatETA(ms: number): string {
	if (ms <= 0) return ""
	const seconds = Math.ceil(ms / 1000)
	if (seconds < 60) return `~${seconds}s`
	const minutes = Math.floor(seconds / 60)
	const remaining = seconds % 60
	return `~${minutes}m ${remaining}s`
}

class SpinnerProgressTracker implements ProgressTracker {
	private totalWaves = 0
	private totalAspects = 0
	private completedAspects = 0
	private spinnerFrame = 0
	private spinnerTimer: ReturnType<typeof setInterval> | null = null
	private currentAspect = ""
	private startTime = 0
	private aspectTimes: number[] = []

	start(totalWaves: number, totalAspects: number): void {
		this.totalWaves = totalWaves
		this.totalAspects = totalAspects
		this.completedAspects = 0
		this.startTime = Date.now()
		this.aspectTimes = []
	}

	startWave(waveOrder: number, aspects: string[]): void {
		this.stopSpinner()
		logger.info(`Wave ${waveOrder}/${this.totalWaves}: ${aspects.join(", ")}`)
	}

	startAspect(_aspectName: string, displayName: string): void {
		this.currentAspect = displayName
		this.spinnerFrame = 0
		this.startSpinner()
	}

	completeAspect(_aspectName: string, displayName: string): void {
		this.stopSpinner()
		this.completedAspects++
		if (this.startTime > 0) {
			this.aspectTimes.push(Date.now() - this.startTime)
		}
		const progress = `${this.completedAspects}/${this.totalAspects}`
		const eta = this.computeETA()
		const etaStr = eta ? ` (ETA: ${eta})` : ""
		logger.success(`  ${displayName}: completed [${progress}]${etaStr}`)
	}

	failAspect(_aspectName: string, displayName: string, error: string): void {
		this.stopSpinner()
		this.completedAspects++
		const progress = `${this.completedAspects}/${this.totalAspects}`
		logger.warn(`  ${displayName}: failed — ${error} [${progress}]`)
	}

	completeWave(waveOrder: number, succeeded: number, total: number, elapsed: string): void {
		this.stopSpinner()
		logger.info(`Wave ${waveOrder} complete: ${succeeded}/${total} succeeded [${elapsed}]`)
	}

	done(succeeded: number, failed: number): void {
		this.stopSpinner()
		const total = succeeded + failed
		const bar = renderBar(succeeded, total, 20)
		if (failed > 0) {
			logger.warn(`Analysis complete: ${bar} ${succeeded}/${total} succeeded, ${failed} failed`)
		} else {
			logger.success(`Analysis complete: ${bar} ${succeeded}/${total} succeeded`)
		}
	}

	private computeETA(): string {
		if (this.aspectTimes.length === 0 || this.completedAspects >= this.totalAspects) return ""
		const avgTime = this.aspectTimes.reduce((a, b) => a + b, 0) / this.aspectTimes.length
		const remaining = this.totalAspects - this.completedAspects
		return formatETA(avgTime * remaining)
	}

	private startSpinner(): void {
		this.stopSpinner()
		if (!process.stdout.isTTY) return
		this.spinnerTimer = setInterval(() => {
			const frame = SPINNER_FRAMES[this.spinnerFrame % SPINNER_FRAMES.length]
			this.spinnerFrame++
			const progress = `${this.completedAspects + 1}/${this.totalAspects}`
			const bar = renderBar(this.completedAspects, this.totalAspects, 15)
			const eta = this.computeETA()
			const etaStr = eta ? ` ETA: ${eta}` : ""
			process.stderr.write(`\r  ${frame} ${this.currentAspect} ${bar} [${progress}]${etaStr}  `)
		}, SPINNER_INTERVAL_MS)
	}

	private stopSpinner(): void {
		if (this.spinnerTimer) {
			clearInterval(this.spinnerTimer)
			this.spinnerTimer = null
			if (process.stdout.isTTY) {
				process.stderr.write("\r\x1b[K")
			}
		}
	}
}

class LogProgressTracker implements ProgressTracker {
	private totalAspects = 0
	private completedAspects = 0
	private startTime = 0
	private aspectTimes: number[] = []

	start(_totalWaves: number, totalAspects: number): void {
		this.totalAspects = totalAspects
		this.completedAspects = 0
		this.startTime = Date.now()
		this.aspectTimes = []
	}

	startWave(waveOrder: number, aspects: string[]): void {
		logger.info(`Wave ${waveOrder}: ${aspects.join(", ")}`)
	}

	startAspect(_aspectName: string, _displayName: string): void {}

	completeAspect(_aspectName: string, displayName: string): void {
		this.completedAspects++
		if (this.startTime > 0) {
			this.aspectTimes.push(Date.now() - this.startTime)
		}
		const progress = `${this.completedAspects}/${this.totalAspects}`
		logger.success(`  ${displayName}: completed [${progress}]`)
	}

	failAspect(_aspectName: string, displayName: string, error: string): void {
		this.completedAspects++
		const progress = `${this.completedAspects}/${this.totalAspects}`
		logger.warn(`  ${displayName}: failed — ${error} [${progress}]`)
	}

	completeWave(waveOrder: number, succeeded: number, total: number, elapsed: string): void {
		logger.info(`Wave ${waveOrder} complete: ${succeeded}/${total} succeeded [${elapsed}]`)
	}

	done(succeeded: number, failed: number): void {
		const total = succeeded + failed
		if (failed > 0) {
			logger.warn(`Analysis complete: ${succeeded}/${total} succeeded, ${failed} failed`)
		} else {
			logger.success(`Analysis complete: ${succeeded}/${total} succeeded`)
		}
	}
}

export function createProgressTracker(): ProgressTracker {
	if (process.stdout.isTTY) {
		return new SpinnerProgressTracker()
	}
	return new LogProgressTracker()
}

/** @internal Exported for testing */
export function renderBar(completed: number, total: number, width: number): string {
	if (total === 0) return `[${"░".repeat(width)}]`
	const filled = Math.round((completed / total) * width)
	return `[${"█".repeat(filled)}${"░".repeat(width - filled)}]`
}
