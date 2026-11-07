import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestDb, resetTestDb } from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const { upsertBeer } = await import("./upsertBeer.server");

const beer = {
	untappdBeerId: 42,
	name: "Beer Geek Breakfast",
	breweryName: "Mikkeller",
	abv: 7.5,
	style: "Stout",
	label: "label.png",
};

describe("upsertBeer", () => {
	beforeEach(() => resetTestDb(testDb));

	it("returns the same id for a beer that's already stored, keeping it as it is", () => {
		const first = upsertBeer(beer);
		const second = upsertBeer({ ...beer, name: "Renamed" });

		expect(second).toBe(first);

		const rows = testDb.query.beers.findMany().sync();
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe("Beer Geek Breakfast");
	});

	it("stores a 0% beer", () => {
		upsertBeer({ ...beer, abv: 0 });

		expect(testDb.query.beers.findFirst().sync()?.abv).toBe(0);
	});
});
