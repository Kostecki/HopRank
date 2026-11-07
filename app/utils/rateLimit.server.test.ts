import { describe, expect, it } from "vitest";

import { createFailureLimiter } from "./rateLimit.server";

describe("createFailureLimiter", () => {
	it("limits a key after the maximum number of failures", () => {
		const limiter = createFailureLimiter({ maxFailures: 3, windowMs: 1000 });

		for (let i = 0; i < 3; i++) {
			expect(limiter.isLimited("a", 0)).toBe(false);
			limiter.recordFailure("a", 0);
		}

		expect(limiter.isLimited("a", 0)).toBe(true);
		expect(limiter.isLimited("b", 0)).toBe(false);
	});

	it("resets once the window has passed", () => {
		const limiter = createFailureLimiter({ maxFailures: 1, windowMs: 1000 });

		limiter.recordFailure("a", 0);
		expect(limiter.isLimited("a", 999)).toBe(true);
		expect(limiter.isLimited("a", 1000)).toBe(false);
	});
});
