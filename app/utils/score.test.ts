import { describe, expect, it } from "vitest";

import { calculateVoteScore } from "./score";

describe("calculateVoteScore", () => {
	it("returns the plain average when all weights are equal", () => {
		const score = calculateVoteScore({ Aroma: 4, Taste: 2 }, [
			{ name: "Aroma", weight: 1 },
			{ name: "Taste", weight: 1 },
		]);

		expect(score).toBe(3);
	});

	it("weights criteria according to their configured weight", () => {
		const score = calculateVoteScore({ Aroma: 4, Taste: 2 }, [
			{ name: "Aroma", weight: 3 },
			{ name: "Taste", weight: 1 },
		]);

		// (4*3 + 2*1) / 4 = 3.5
		expect(score).toBe(3.5);
	});

	it("defaults to weight 1 for criteria not found in the ratings list", () => {
		const score = calculateVoteScore({ Unknown: 5 }, []);

		expect(score).toBe(5);
	});

	it("returns 0 for an empty values object", () => {
		expect(calculateVoteScore({}, [{ name: "Aroma", weight: 1 }])).toBe(0);
	});

	it("rounds to 2 decimal places", () => {
		const score = calculateVoteScore({ A: 1, B: 2, C: 2 }, [
			{ name: "A", weight: 1 },
			{ name: "B", weight: 1 },
			{ name: "C", weight: 1 },
		]);

		// (1+2+2)/3 = 1.6666... -> 1.67
		expect(score).toBe(1.67);
	});
});
