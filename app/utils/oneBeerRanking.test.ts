import { describe, expect, it } from "vitest";

import {
	findAgreement,
	findDuplicateBar,
	formatBarAddress,
	getBarMapUrl,
	getBarStats,
	getPersonalPlacements,
	mergeBarOrder,
	RANKING_START,
	getRankedBarIds,
	getRowPlacements,
	isValidArrangement,
	withWaitingArea,
	rankBars,
} from "./oneBeerRanking";

const list = (userId: number, barIds: number[]) =>
	barIds.map((barId, index) => ({ barId, userId, position: index + 1 }));

describe("rankBars", () => {
	it("equals the plain average position when everyone ranked every bar", () => {
		const result = rankBars(
			[1, 2, 3],
			[...list(1, [1, 2, 3]), ...list(2, [2, 1, 3])],
		);

		expect(result).toEqual([
			{ barId: 1, averagePosition: 1.5 },
			{ barId: 2, averagePosition: 1.5 },
			{ barId: 3, averagePosition: 3 },
		]);
	});

	it("doesn't reward a bar for being first on a late joiner's short list", () => {
		const result = rankBars(
			[1, 2, 3, 4],
			[...list(1, [1, 2, 3, 4]), ...list(2, [1, 2, 3, 4]), ...list(3, [4])],
		);

		const byId = new Map(result.map((r) => [r.barId, r.averagePosition]));

		// One bar on a list is a neutral vote: the middle of the full list.
		// Bar 4 stays last, rather than being pulled up by an uncontested "1".
		expect(byId.get(4)).toBeCloseTo(((0.875 + 0.875 + 0.5) / 3) * 4 + 0.5);
		expect(result.at(-1)?.barId).toBe(4);
	});

	it("ignores a bar that is still open", () => {
		const result = rankBars(
			[1, 2],
			[...list(1, [3, 2, 1]), ...list(2, [2, 3, 1])],
		);

		expect(result).toEqual([
			{ barId: 2, averagePosition: 1 },
			{ barId: 1, averagePosition: 2 },
		]);
	});

	it("handles lists with gaps after a bar was removed", () => {
		const result = rankBars(
			[1, 2],
			[
				{ barId: 1, userId: 1, position: 2 },
				{ barId: 2, userId: 1, position: 5 },
			],
		);

		expect(result).toEqual([
			{ barId: 1, averagePosition: 1 },
			{ barId: 2, averagePosition: 2 },
		]);
	});

	it("returns nothing when no bars are finished", () => {
		expect(rankBars([], list(1, [1]))).toEqual([]);
	});
});

describe("getBarStats", () => {
	it("totals first places and the range of placements", () => {
		const stats = getBarStats(
			[1, 2, 3],
			[...list(1, [1, 2, 3]), ...list(2, [1, 3, 2]), ...list(3, [3, 1, 2])],
		);

		expect(stats.get(1)).toEqual({
			placedByCount: 3,
			firstPlaceCount: 2,
			bestPosition: 1,
			worstPosition: 2,
		});
		expect(stats.get(3)).toEqual({
			placedByCount: 3,
			firstPlaceCount: 1,
			bestPosition: 1,
			worstPosition: 3,
		});
	});

	it("ignores open bars when numbering each list", () => {
		const stats = getBarStats([1, 2], list(1, [3, 2, 1]));

		expect(stats.get(2)).toMatchObject({
			firstPlaceCount: 1,
			bestPosition: 1,
			worstPosition: 1,
		});
		expect(stats.has(3)).toBe(false);
	});
});

describe("getPersonalPlacements", () => {
	it("numbers each person's finished bars, leaving out the rest", () => {
		const result = getPersonalPlacements(
			[1, 2],
			[...list(1, [3, 2, 1]), ...list(2, [1])],
		);

		expect(result).toEqual([
			{ userId: 1, positions: { 2: 1, 1: 2 } },
			{ userId: 2, positions: { 1: 1 } },
		]);
	});

	it("keeps people in a stable order, whoever saved last", () => {
		const result = getPersonalPlacements(
			[1],
			[...list(2, [1]), ...list(1, [1])],
		);

		expect(result.map((r) => r.userId)).toEqual([1, 2]);
	});

	it("leaves out people with no finished bars", () => {
		expect(getPersonalPlacements([1], list(1, [2]))).toEqual([]);
	});
});

describe("findAgreement", () => {
	const bar = (
		id: number,
		bestPosition: number,
		worstPosition: number,
		placedByCount = 3,
	) => ({
		id,
		averagePosition: id,
		placedByCount,
		firstPlaceCount: 0,
		bestPosition,
		worstPosition,
	});

	it("finds the smallest and largest spread", () => {
		const result = findAgreement([bar(1, 1, 2), bar(2, 2, 2), bar(3, 1, 4)]);

		expect(result?.mostAgreed.id).toBe(2);
		expect(result?.mostDisagreed.id).toBe(3);
	});

	it("returns null when every bar has the same spread", () => {
		expect(findAgreement([bar(1, 1, 2), bar(2, 1, 2)])).toBeNull();
	});

	it("ignores bars placed by only one person", () => {
		expect(findAgreement([bar(1, 2, 2, 1), bar(2, 1, 4)])).toBeNull();
	});
});

describe("the waiting area", () => {
	const START = RANKING_START;

	it("puts the new bar above the line", () => {
		expect(withWaitingArea([1, 2, 3], 3)).toEqual([3, START, 1, 2]);
	});

	it("leaves the waiting bar out of the ranking", () => {
		expect(getRankedBarIds([3, START, 1, 2])).toEqual([1, 2]);
	});

	it("makes a bar dragged just past the line number 1", () => {
		const order = [START, 3, 1, 2];

		expect(getRankedBarIds(order)).toEqual([3, 1, 2]);
		expect(getRowPlacements(order)).toEqual([null, 1, 2, 3]);
	});

	it("gives the waiting bar and the line no number", () => {
		expect(getRowPlacements([3, START, 1, 2])).toEqual([null, null, 1, 2]);
	});

	it("numbers every row when there's no line", () => {
		expect(getRowPlacements([1, 2])).toEqual([1, 2]);
		expect(getRankedBarIds([1, 2])).toEqual([1, 2]);
	});

	it("only lets the new bar sit above the line", () => {
		expect(isValidArrangement([3, START, 1], 3)).toBe(true);
		expect(isValidArrangement([START, 3, 1], 3)).toBe(true);
		expect(isValidArrangement([1, START, 3], 3)).toBe(false);
		expect(isValidArrangement([3, 1, START], 3)).toBe(false);
		expect(isValidArrangement([1, 2], null)).toBe(true);
	});
});

describe("bar locations", () => {
	const location = {
		address: "Nørrebrogade 1",
		city: "København",
		lat: 55.68,
		lng: 12.56,
	};
	const empty = { address: null, city: null, lat: null, lng: null };

	it("joins the address parts it has", () => {
		expect(formatBarAddress(location)).toBe("Nørrebrogade 1, København");
		expect(formatBarAddress({ ...empty, city: "Aarhus" })).toBe("Aarhus");
		expect(formatBarAddress(empty)).toBe("");
	});

	it("links to the coordinates when it has them", () => {
		expect(getBarMapUrl(location)).toBe(
			"https://www.google.com/maps/search/?api=1&query=55.68%2C12.56",
		);
	});

	it("falls back to the address, and to nothing", () => {
		expect(getBarMapUrl({ ...empty, city: "Aarhus" })).toContain(
			"query=Aarhus",
		);
		expect(getBarMapUrl(empty)).toBeNull();
	});

	it("keeps a coordinate of exactly 0", () => {
		expect(getBarMapUrl({ ...empty, lat: 0, lng: 0 })).toContain("0%2C0");
	});
});

describe("findDuplicateBar", () => {
	const bars = [
		{ id: 1, name: "Bar A", foursquareId: "fsq1" },
		{ id: 2, name: "typed bar", foursquareId: null },
	];

	it("matches the same venue, even under another name", () => {
		expect(
			findDuplicateBar(bars, { name: "Renamed", foursquareId: "fsq1" })?.id,
		).toBe(1);
	});

	it("matches the same name, ignoring case and spaces", () => {
		expect(
			findDuplicateBar(bars, { name: " TYPED BAR ", foursquareId: "fsq2" })?.id,
		).toBe(2);
	});

	it("doesn't match a different bar", () => {
		expect(
			findDuplicateBar(bars, { name: "Other", foursquareId: "fsq2" }),
		).toBeUndefined();
	});

	it("doesn't treat two typed bars as the same venue", () => {
		expect(
			findDuplicateBar(bars, { name: "Other", foursquareId: null }),
		).toBeUndefined();
	});

	it("can leave out the bar being changed", () => {
		expect(
			findDuplicateBar(bars, { name: "Typed Bar", foursquareId: "fsq2" }, 2),
		).toBeUndefined();
	});
});

describe("mergeBarOrder", () => {
	it("keeps the local order", () => {
		expect(mergeBarOrder([3, 1, 2], [1, 2, 3])).toEqual([3, 1, 2]);
	});

	it("appends new bars and drops removed ones", () => {
		expect(mergeBarOrder([3, 1, 2], [1, 3, 4])).toEqual([3, 1, 4]);
	});
});
