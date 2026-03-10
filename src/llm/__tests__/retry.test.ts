import { describe, expect, it, vi } from "vitest"
import { withRetry } from "../retry.js"

function createStatusError(statusCode: number, message = "error"): Error {
	const error = new Error(message) as Error & { statusCode: number }
	error.statusCode = statusCode
	return error
}

const shortRetry = { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 }

describe("withRetry", () => {
	it("returns result on first success", async () => {
		const fn = vi.fn().mockResolvedValue("ok")
		const result = await withRetry(fn, shortRetry)
		expect(result).toBe("ok")
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it("retries on 429 and succeeds", async () => {
		const fn = vi.fn().mockRejectedValueOnce(createStatusError(429)).mockResolvedValue("ok")
		const result = await withRetry(fn, shortRetry)
		expect(result).toBe("ok")
		expect(fn).toHaveBeenCalledTimes(2)
	})

	it("retries on 500 status", async () => {
		const fn = vi.fn().mockRejectedValueOnce(createStatusError(500)).mockResolvedValue("ok")
		const result = await withRetry(fn, shortRetry)
		expect(result).toBe("ok")
		expect(fn).toHaveBeenCalledTimes(2)
	})

	it("retries on AbortError", async () => {
		const error = new Error("aborted")
		error.name = "AbortError"
		const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue("ok")
		const result = await withRetry(fn, shortRetry)
		expect(result).toBe("ok")
		expect(fn).toHaveBeenCalledTimes(2)
	})

	it("retries on TimeoutError", async () => {
		const error = new Error("timeout")
		error.name = "TimeoutError"
		const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue("ok")
		const result = await withRetry(fn, shortRetry)
		expect(result).toBe("ok")
		expect(fn).toHaveBeenCalledTimes(2)
	})

	it("retries on ECONNRESET", async () => {
		const fn = vi.fn().mockRejectedValueOnce(new Error("read ECONNRESET")).mockResolvedValue("ok")
		const result = await withRetry(fn, shortRetry)
		expect(result).toBe("ok")
		expect(fn).toHaveBeenCalledTimes(2)
	})

	it("does NOT retry auth errors", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("Invalid API key"))
		await expect(withRetry(fn, shortRetry)).rejects.toThrow("Invalid API key")
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it("does NOT retry billing errors", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("余额不足"))
		await expect(withRetry(fn, shortRetry)).rejects.toThrow("余额不足")
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it("does NOT retry Unauthorized", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("Unauthorized"))
		await expect(withRetry(fn, shortRetry)).rejects.toThrow("Unauthorized")
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it("throws after maxRetries exhausted", async () => {
		const fn = vi.fn().mockRejectedValue(createStatusError(429, "rate limited"))
		await expect(withRetry(fn, shortRetry)).rejects.toThrow("rate limited")
		expect(fn).toHaveBeenCalledTimes(3)
	})

	it("does NOT retry non-retryable errors", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("Some random error"))
		await expect(withRetry(fn, shortRetry)).rejects.toThrow("Some random error")
		expect(fn).toHaveBeenCalledTimes(1)
	})
})
