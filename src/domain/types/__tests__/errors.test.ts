import { describe, expect, it } from "vitest"
import { LLMError, SystemError, UserError } from "../errors.js"

describe("Error classes", () => {
	it("UserError has code 1", () => {
		const err = new UserError("test")
		expect(err.code).toBe(1)
		expect(err.name).toBe("UserError")
		expect(err.message).toBe("test")
	})

	it("SystemError has code 2", () => {
		const err = new SystemError("test")
		expect(err.code).toBe(2)
		expect(err.name).toBe("SystemError")
	})

	it("LLMError has code 3 with provider info", () => {
		const err = new LLMError("test", { provider: "openai", model: "gpt-5.2" })
		expect(err.code).toBe(3)
		expect(err.name).toBe("LLMError")
		expect(err.provider).toBe("openai")
		expect(err.model).toBe("gpt-5.2")
	})
})
