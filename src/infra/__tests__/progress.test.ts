import type { ProgressTracker } from "@infra/progress.js"
import { createProgressTracker, renderBar } from "@infra/progress.js"
import { describe, expect, it, vi } from "vitest"

describe("renderBar", () => {
	it("renders empty bar when total is 0", () => {
		expect(renderBar(0, 0, 10)).toBe("[░░░░░░░░░░]")
	})

	it("renders full bar when completed equals total", () => {
		expect(renderBar(5, 5, 10)).toBe("[██████████]")
	})

	it("renders half bar at 50%", () => {
		expect(renderBar(3, 6, 10)).toBe("[█████░░░░░]")
	})

	it("handles width of 0", () => {
		expect(renderBar(5, 5, 0)).toBe("[]")
	})

	it("rounds correctly at 33%", () => {
		const bar = renderBar(1, 3, 9)
		expect(bar).toBe("[███░░░░░░]")
	})
})

describe("createProgressTracker", () => {
	it("returns tracker with all required methods when stdout is TTY", () => {
		const original = process.stdout.isTTY
		Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true })

		const tracker = createProgressTracker()
		expect(typeof tracker.start).toBe("function")
		expect(typeof tracker.startWave).toBe("function")
		expect(typeof tracker.startAspect).toBe("function")
		expect(typeof tracker.completeAspect).toBe("function")
		expect(typeof tracker.failAspect).toBe("function")
		expect(typeof tracker.completeWave).toBe("function")
		expect(typeof tracker.done).toBe("function")

		Object.defineProperty(process.stdout, "isTTY", { value: original, configurable: true })
	})

	it("returns LogProgressTracker when stdout is not a TTY", () => {
		const original = process.stdout.isTTY
		Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true })

		const tracker = createProgressTracker()
		expect(typeof tracker.start).toBe("function")

		expect(() => {
			tracker.start(3, 7)
			tracker.startWave(1, ["designTokens"])
			tracker.startAspect("designTokens", "Design Tokens")
			tracker.completeAspect("designTokens", "Design Tokens")
			tracker.failAspect("typography", "Typography", "timeout")
			tracker.completeWave(1, 1, 2, "1.5s")
			tracker.done(5, 2)
		}).not.toThrow()

		Object.defineProperty(process.stdout, "isTTY", { value: original, configurable: true })
	})
})

describe("ProgressTracker lifecycle", () => {
	it("custom tracker receives all calls in correct order", () => {
		const calls: string[] = []
		const tracker: ProgressTracker = {
			start: () => calls.push("start"),
			startWave: () => calls.push("startWave"),
			startAspect: () => calls.push("startAspect"),
			completeAspect: () => calls.push("completeAspect"),
			failAspect: () => calls.push("failAspect"),
			completeWave: () => calls.push("completeWave"),
			done: () => calls.push("done"),
		}

		tracker.start(2, 4)
		tracker.startWave(1, ["designTokens", "typography"])
		tracker.startAspect("designTokens", "Design Tokens")
		tracker.completeAspect("designTokens", "Design Tokens")
		tracker.startAspect("typography", "Typography")
		tracker.failAspect("typography", "Typography", "error")
		tracker.completeWave(1, 1, 2, "5.0s")
		tracker.done(3, 1)

		expect(calls).toEqual([
			"start",
			"startWave",
			"startAspect",
			"completeAspect",
			"startAspect",
			"failAspect",
			"completeWave",
			"done",
		])
	})
})
