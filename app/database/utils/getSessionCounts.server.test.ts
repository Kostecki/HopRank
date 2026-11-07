import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionMode, SessionStatus } from "~/types/session";

import { createTestDb, resetTestDb } from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const { getSessionCounts } = await import("./getSessionCounts.server");
const {
	beers,
	sessionBars,
	sessionBeers,
	sessionState,
	sessions,
	sessionUsers,
	users,
} = await import("../schema.server");

describe("getSessionCounts", () => {
	beforeEach(() => resetTestDb(testDb));

	it("counts active participants, and beers or bars by mode, per session", async () => {
		const [a, b] = await testDb
			.insert(users)
			.values([{ email: "a@test.com" }, { email: "b@test.com" }])
			.returning();
		const [normal, oneBeer, empty] = await testDb
			.insert(sessions)
			.values([
				{ name: "Normal", joinCode: "AAAAA", createdBy: a.id },
				{
					name: "Crawl",
					joinCode: "BBBBB",
					createdBy: a.id,
					mode: SessionMode.oneBeer,
				},
				{ name: "Empty", joinCode: "CCCCC", createdBy: a.id },
			])
			.returning();
		await testDb
			.insert(sessionState)
			.values([
				{ sessionId: normal.id, status: SessionStatus.active },
				{ sessionId: oneBeer.id, status: SessionStatus.finished },
				{ sessionId: empty.id },
			]);
		await testDb.insert(sessionUsers).values([
			{ sessionId: normal.id, userId: a.id, active: true },
			{ sessionId: normal.id, userId: b.id, active: false },
			{ sessionId: oneBeer.id, userId: b.id, active: true },
		]);
		const [beer] = await testDb
			.insert(beers)
			.values({
				untappdBeerId: 1,
				name: "Beer",
				breweryName: "Brewery",
				style: "IPA",
				label: "label.png",
			})
			.returning();
		await testDb
			.insert(sessionBeers)
			.values({ sessionId: normal.id, beerId: beer.id, addedByUserId: a.id });
		await testDb.insert(sessionBars).values([
			{ sessionId: oneBeer.id, name: "Bar 1", addedByUserId: b.id, order: 1 },
			{ sessionId: oneBeer.id, name: "Bar 2", addedByUserId: b.id, order: 2 },
		]);

		const counts = getSessionCounts([normal.id, oneBeer.id, empty.id]);

		expect(counts.get(normal.id)).toEqual({
			status: SessionStatus.active,
			participantCount: 1,
			beerCount: 1,
		});
		expect(counts.get(oneBeer.id)).toEqual({
			status: SessionStatus.finished,
			participantCount: 1,
			beerCount: 2,
		});
		expect(counts.get(empty.id)).toEqual({
			status: SessionStatus.created,
			participantCount: 0,
			beerCount: 0,
		});
	});

	it("returns nothing for no sessions", () => {
		expect(getSessionCounts([]).size).toBe(0);
	});
});
