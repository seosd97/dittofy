import { describe, expect, it } from "vitest"

function createConcurrencyLimiter(limit: number) {
	let active = 0
	const queue: (() => void)[] = []

	function acquire(): Promise<void> {
		if (active < limit) {
			active++
			return Promise.resolve()
		}
		return new Promise<void>((resolve) => queue.push(resolve))
	}

	function release(): void {
		active--
		if (queue.length > 0) {
			active++
			const next = queue.shift()
			if (next) next()
		}
	}

	return async <T>(fn: () => Promise<T>): Promise<T> => {
		await acquire()
		try {
			return await fn()
		} finally {
			release()
		}
	}
}

describe("createConcurrencyLimiter", () => {
	it("respects the concurrency limit", async () => {
		const limit = 2
		const withLimit = createConcurrencyLimiter(limit)
		let maxConcurrent = 0
		let currentConcurrent = 0

		const tasks = Array.from({ length: 10 }, (_, i) =>
			withLimit(async () => {
				currentConcurrent++
				maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
				await new Promise((resolve) => setTimeout(resolve, 20))
				currentConcurrent--
				return i
			}),
		)

		await Promise.all(tasks)
		expect(maxConcurrent).toBeLessThanOrEqual(limit)
	})

	it("runs all tasks to completion", async () => {
		const withLimit = createConcurrencyLimiter(2)
		const results: number[] = []

		const tasks = Array.from({ length: 5 }, (_, i) =>
			withLimit(async () => {
				results.push(i)
				return i
			}),
		)

		await Promise.all(tasks)
		expect(results).toHaveLength(5)
	})

	it("handles single concurrency (sequential)", async () => {
		const withLimit = createConcurrencyLimiter(1)
		const order: number[] = []

		const tasks = Array.from({ length: 3 }, (_, i) =>
			withLimit(async () => {
				order.push(i)
				await new Promise((resolve) => setTimeout(resolve, 10))
			}),
		)

		await Promise.all(tasks)
		expect(order).toEqual([0, 1, 2])
	})

	it("releases slot when task throws", async () => {
		const withLimit = createConcurrencyLimiter(1)
		let secondRan = false

		const results = await Promise.allSettled([
			withLimit(async () => {
				throw new Error("fail")
			}),
			withLimit(async () => {
				secondRan = true
			}),
		])

		expect(results[0].status).toBe("rejected")
		expect(results[1].status).toBe("fulfilled")
		expect(secondRan).toBe(true)
	})

	it("allows high concurrency with limit greater than tasks", async () => {
		const withLimit = createConcurrencyLimiter(10)
		let maxConcurrent = 0
		let currentConcurrent = 0

		const tasks = Array.from({ length: 3 }, (_, i) =>
			withLimit(async () => {
				currentConcurrent++
				maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
				await new Promise((resolve) => setTimeout(resolve, 10))
				currentConcurrent--
			}),
		)

		await Promise.all(tasks)
		expect(maxConcurrent).toBe(3)
	})
})
