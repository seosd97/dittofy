import { consola } from "consola"

export function createProgress(label: string) {
	const startTime = Date.now()

	return {
		update(message: string) {
			consola.info(`  ${label}: ${message}`)
		},
		done(message?: string) {
			const duration = ((Date.now() - startTime) / 1000).toFixed(1)
			consola.success(`  ${label}: ${message ?? "완료"} (${duration}s)`)
		},
		fail(message: string) {
			const duration = ((Date.now() - startTime) / 1000).toFixed(1)
			consola.error(`  ${label}: ${message} (${duration}s)`)
		},
	}
}
