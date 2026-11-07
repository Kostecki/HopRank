import { describe, expect, it } from "vitest";

import { averageByCriterion, scoreBeer } from "./scoring";

const criteria = [
	{ id: 1, name: "Smag", weight: 2 },
	{ id: 2, name: "Duft", weight: 1 },
];

describe("averageByCriterion", () => {
	it("averages each criterion's scores, with 0 for one nobody rated", () => {
		expect(
			averageByCriterion(
				[
					{ criterionId: 1, score: 4 },
					{ criterionId: 1, score: 2 },
				],
				criteria,
			).map((c) => c.averageScore),
		).toEqual([3, 0]);
	});
});

describe("scoreBeer", () => {
	it("weights each criterion's average by its weight", () => {
		const { averageScore, criteriaBreakdown } = scoreBeer(
			[
				{ criterionId: 1, score: 4 },
				{ criterionId: 2, score: 1 },
			],
			criteria,
		);

		// (4 * 2 + 1 * 1) / 3
		expect(averageScore).toBe(3);
		expect(criteriaBreakdown.map((c) => c.averageScore)).toEqual([4, 1]);
	});

	it("scores 0 without criteria", () => {
		expect(scoreBeer([], []).averageScore).toBe(0);
	});
});
