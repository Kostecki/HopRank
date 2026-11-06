import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionBeerStatus, SessionMode, SessionStatus } from "~/types/session";

import { createTestDb, resetTestDb } from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const {
	addBar,
	correctBar,
	getOneBeerRanking,
	getPersonalBarList,
	getSessionBars,
	removeBar,
	reorderQueue,
	savePlacements,
	startOneBeerSession,
	syncVenueDetails,
} = await import("./oneBeer.server");
const { tryAdvanceSession } = await import("./tryAdvanceSession.server");
const { beers, sessionBars, sessionState, sessions, sessionUsers, users } =
	await import("../schema.server");

const typed = (name: string) => ({ name, foursquareId: null });
const venue = (name: string, foursquareId: string) => ({ name, foursquareId });

describe("One Beer mode", () => {
	let sessionId: number;
	let owner: number;
	let guest: number;

	const statuses = () =>
		testDb
			.select({ name: sessionBars.name, status: sessionBars.status })
			.from(sessionBars)
			.where(eq(sessionBars.sessionId, sessionId))
			.orderBy(sessionBars.order)
			.all();

	const barId = (name: string) => {
		const bar = testDb
			.select()
			.from(sessionBars)
			.where(eq(sessionBars.name, name))
			.get();
		if (!bar) throw new Error(`No bar called ${name}`);
		return bar.id;
	};

	beforeEach(async () => {
		resetTestDb(testDb);

		const [a, b] = await testDb
			.insert(users)
			.values([{ email: "owner@test.com" }, { email: "guest@test.com" }])
			.returning();
		owner = a.id;
		guest = b.id;

		const [beer] = await testDb
			.insert(beers)
			.values({
				untappdBeerId: 1,
				name: "Stout",
				breweryName: "Brewery",
				style: "Stout",
				label: "label.png",
			})
			.returning();

		const [session] = await testDb
			.insert(sessions)
			.values({
				name: "Crawl",
				joinCode: "ABC12",
				createdBy: owner,
				mode: SessionMode.oneBeer,
				beerId: beer.id,
			})
			.returning();
		sessionId = session.id;

		await testDb
			.insert(sessionState)
			.values({ sessionId, status: SessionStatus.active });
		await testDb.insert(sessionUsers).values([
			{ sessionId, userId: owner, active: true },
			{ sessionId, userId: guest, active: true },
		]);
	});

	describe("adding bars", () => {
		it("opens the first bar and queues later ones in the order added", () => {
			addBar(sessionId, owner, typed("First"));
			addBar(sessionId, guest, typed("Second"));
			addBar(sessionId, owner, typed("Third"));

			expect(statuses()).toEqual([
				{ name: "First", status: SessionBeerStatus.rating },
				{ name: "Second", status: SessionBeerStatus.waiting },
				{ name: "Third", status: SessionBeerStatus.waiting },
			]);
		});

		it("rejects the same venue and names the bar on the list", () => {
			addBar(sessionId, owner, venue("Bar A", "fsq1"));

			const result = addBar(sessionId, guest, venue("Bar A renamed", "fsq1"));

			expect(result).toEqual({
				ok: false,
				status: 409,
				message: "Bar A er allerede på listen",
			});
			expect(statuses()).toHaveLength(1);
		});

		it("rejects the same name, ignoring case and spaces", () => {
			addBar(sessionId, owner, typed("Bar A"));

			expect(addBar(sessionId, guest, typed("  bar a ")).ok).toBe(false);
			expect(addBar(sessionId, guest, venue("BAR A", "fsq1")).ok).toBe(false);
			expect(statuses()).toHaveLength(1);
		});

		it("rejects an empty name", () => {
			expect(addBar(sessionId, owner, typed("   ")).ok).toBe(false);
		});

		it("rejects bars in a finished session or a normal session", async () => {
			await testDb
				.update(sessionState)
				.set({ status: SessionStatus.finished })
				.where(eq(sessionState.sessionId, sessionId));

			expect(addBar(sessionId, owner, typed("Bar")).ok).toBe(false);

			await testDb
				.update(sessionState)
				.set({ status: SessionStatus.active })
				.where(eq(sessionState.sessionId, sessionId));
			await testDb
				.update(sessions)
				.set({ mode: SessionMode.normal })
				.where(eq(sessions.id, sessionId));

			expect(addBar(sessionId, owner, typed("Bar")).ok).toBe(false);
		});
	});

	describe("before the session starts", () => {
		beforeEach(async () => {
			await testDb
				.update(sessionState)
				.set({ status: SessionStatus.created })
				.where(eq(sessionState.sessionId, sessionId));
		});

		it("accepts the first bar without opening it", () => {
			expect(addBar(sessionId, guest, typed("First"))).toEqual({ ok: true });

			expect(statuses()).toEqual([
				{ name: "First", status: SessionBeerStatus.waiting },
			]);
		});

		it("rejects a second bar", () => {
			addBar(sessionId, owner, typed("First"));

			expect(addBar(sessionId, owner, typed("Second"))).toMatchObject({
				ok: false,
				status: 400,
			});
			expect(statuses()).toHaveLength(1);
		});

		it("can't be placed until the session starts", () => {
			addBar(sessionId, owner, typed("First"));

			expect(savePlacements(sessionId, owner, [barId("First")]).ok).toBe(false);
		});

		it("opens the first bar on start", () => {
			addBar(sessionId, owner, typed("First"));

			startOneBeerSession(sessionId);

			expect(statuses()).toEqual([
				{ name: "First", status: SessionBeerStatus.rating },
			]);
		});

		it("starts without a bar, and the next one added opens", () => {
			startOneBeerSession(sessionId);
			addBar(sessionId, owner, typed("First"));

			expect(statuses()).toEqual([
				{ name: "First", status: SessionBeerStatus.rating },
			]);
		});

		it("can correct and remove the first bar without opening another", () => {
			addBar(sessionId, owner, typed("first"));
			const id = barId("first");

			expect(correctBar(sessionId, id, venue("First", "fsq1"))).toEqual({
				ok: true,
			});
			expect(removeBar(sessionId, id, { id: owner, admin: false })).toEqual({
				ok: true,
			});
			expect(statuses()).toEqual([]);
		});
	});

	describe("venue details", () => {
		const details = {
			address: "Nørrebrogade 1",
			city: "København",
			category: "Pub",
			lat: 55.68,
			lng: 12.56,
		};

		const savedBar = async () => {
			const bars = await getSessionBars(sessionId);
			return bars[0];
		};

		it("saves them for a bar found through search", async () => {
			addBar(sessionId, owner, { ...venue("Bar A", "fsq1"), ...details });

			expect(await savedBar()).toMatchObject(details);
		});

		it("drops them for a bar typed by hand", async () => {
			addBar(sessionId, owner, { ...typed("Bar A"), ...details });

			expect(await savedBar()).toMatchObject({
				address: null,
				lat: null,
			});
		});

		it("drops values that aren't valid", async () => {
			addBar(sessionId, owner, {
				...venue("Bar A", "fsq1"),
				lat: 500,
				lng: "12" as unknown as number,
			});

			expect(await savedBar()).toMatchObject({
				lat: null,
				lng: null,
			});
		});

		it("adds them when a typed bar is linked to a venue", async () => {
			addBar(sessionId, owner, typed("bar a"));

			correctBar(sessionId, barId("bar a"), {
				...venue("Bar A", "fsq1"),
				...details,
			});

			expect(await savedBar()).toMatchObject(details);
		});

		describe("keeping saved bars up to date", () => {
			it("updates details and name that differ", async () => {
				addBar(sessionId, owner, { ...venue("Bar A", "fsq1"), ...details });

				const changed = syncVenueDetails(sessionId, [
					{
						...venue("Bar A Renamed", "fsq1"),
						...details,
						address: "Vesterbrogade 2",
					},
				]);

				expect(changed).toBe(1);
				expect(await savedBar()).toMatchObject({
					name: "Bar A Renamed",
					address: "Vesterbrogade 2",
					city: "København",
				});
			});

			it("reports nothing when the data is the same", () => {
				addBar(sessionId, owner, { ...venue("Bar A", "fsq1"), ...details });

				expect(
					syncVenueDetails(sessionId, [
						{ ...venue("Bar A", "fsq1"), ...details },
					]),
				).toBe(0);
			});

			it("doesn't let blank values erase what's saved", async () => {
				addBar(sessionId, owner, { ...venue("Bar A", "fsq1"), ...details });

				syncVenueDetails(sessionId, [
					{ ...venue("Bar A", "fsq1"), address: null, lat: null },
				]);

				expect(await savedBar()).toMatchObject(details);
			});

			it("ignores venues that aren't in the session, and typed bars", async () => {
				addBar(sessionId, owner, typed("Bar A"));

				expect(
					syncVenueDetails(sessionId, [
						{ ...venue("Bar A", "fsq1"), ...details },
						{ ...venue("Other", "fsq2"), ...details },
					]),
				).toBe(0);
				expect((await savedBar()).address).toBeNull();
			});

			it("keeps the old name if another bar already uses the new one", async () => {
				addBar(sessionId, owner, venue("Bar A", "fsq1"));
				addBar(sessionId, owner, venue("Bar B", "fsq2"));

				syncVenueDetails(sessionId, [venue("Bar B", "fsq1")]);

				expect((await getSessionBars(sessionId)).map((b) => b.name)).toEqual([
					"Bar A",
					"Bar B",
				]);
			});

			it("leaves finished sessions alone", async () => {
				addBar(sessionId, owner, venue("Bar A", "fsq1"));
				await testDb
					.update(sessionState)
					.set({ status: SessionStatus.finished })
					.where(eq(sessionState.sessionId, sessionId));

				expect(
					syncVenueDetails(sessionId, [venue("Bar A Renamed", "fsq1")]),
				).toBe(0);
			});

			it("survives bad input", () => {
				addBar(sessionId, owner, venue("Bar A", "fsq1"));

				expect(syncVenueDetails(sessionId, null as unknown as [])).toBe(0);
				expect(syncVenueDetails(sessionId, [null, {}] as unknown as [])).toBe(
					0,
				);
			});

			it("updates a bar when someone tries to add it again", async () => {
				addBar(sessionId, owner, { ...venue("Bar A", "fsq1"), ...details });

				const result = addBar(sessionId, guest, {
					...venue("Bar A", "fsq1"),
					...details,
					category: "Cocktail Bar",
				});

				expect(result).toMatchObject({ ok: false, status: 409 });
				expect((await savedBar()).category).toBe("Cocktail Bar");
			});
		});

		it("numbers the stops by their current order", async () => {
			addBar(sessionId, owner, typed("A"));
			addBar(sessionId, owner, typed("B"));
			addBar(sessionId, owner, typed("C"));
			reorderQueue(sessionId, [barId("C"), barId("B")]);

			const bars = await getSessionBars(sessionId);

			expect(bars.map((b) => [b.name, b.stopNumber])).toEqual([
				["A", 1],
				["C", 2],
				["B", 3],
			]);
		});
	});

	describe("placing bars", () => {
		it("opens the next bar only after every active participant has placed", () => {
			addBar(sessionId, owner, typed("First"));
			addBar(sessionId, owner, typed("Second"));
			const first = barId("First");

			savePlacements(sessionId, owner, [first]);
			expect(statuses()[0].status).toBe(SessionBeerStatus.rating);

			savePlacements(sessionId, guest, [first]);
			expect(statuses()).toEqual([
				{ name: "First", status: SessionBeerStatus.rated },
				{ name: "Second", status: SessionBeerStatus.rating },
			]);
		});

		it("unblocks the group when the missing person leaves", async () => {
			addBar(sessionId, owner, typed("First"));
			savePlacements(sessionId, owner, [barId("First")]);

			await testDb
				.update(sessionUsers)
				.set({ active: false })
				.where(eq(sessionUsers.userId, guest));
			await tryAdvanceSession(sessionId);

			expect(statuses()[0].status).toBe(SessionBeerStatus.rated);
		});

		it("doesn't finish a bar when nobody is left", async () => {
			addBar(sessionId, owner, typed("First"));

			await testDb.update(sessionUsers).set({ active: false });
			await tryAdvanceSession(sessionId);

			expect(statuses()[0].status).toBe(SessionBeerStatus.rating);
		});

		it("can reorder finished bars while the next one is open", async () => {
			addBar(sessionId, owner, typed("First"));
			const first = barId("First");
			savePlacements(sessionId, owner, [first]);
			savePlacements(sessionId, guest, [first]);
			addBar(sessionId, owner, typed("Second"));
			const second = barId("Second");

			const result = savePlacements(sessionId, owner, [second, first]);

			expect(result).toEqual({ ok: true });
			const list = await getPersonalBarList(sessionId, owner);
			expect(list.bars.map((b) => b.name)).toEqual(["Second", "First"]);
			expect(list.hasPlacedCurrent).toBe(true);
		});

		it("rejects invalid lists", () => {
			addBar(sessionId, owner, typed("First"));
			const first = barId("First");

			for (const list of [[], [first, first], [1.5], ["1"]]) {
				expect(
					savePlacements(sessionId, owner, list as number[]),
				).toMatchObject({ ok: false, status: 400 });
			}
		});

		it("rejects a list containing a bar that isn't open", () => {
			addBar(sessionId, owner, typed("First"));
			addBar(sessionId, owner, typed("Queued"));

			expect(
				savePlacements(sessionId, owner, [barId("First"), barId("Queued")]),
			).toMatchObject({ ok: false, status: 409 });
		});

		it("rejects a stale list that leaves out a placed bar", () => {
			addBar(sessionId, owner, typed("First"));
			const first = barId("First");
			savePlacements(sessionId, owner, [first]);
			savePlacements(sessionId, guest, [first]);
			addBar(sessionId, owner, typed("Second"));

			expect(savePlacements(sessionId, owner, [barId("Second")])).toMatchObject(
				{ ok: false, status: 409 },
			);
		});

		it("gives a late joiner a list starting from the open bar", async () => {
			addBar(sessionId, owner, typed("First"));
			const first = barId("First");
			savePlacements(sessionId, owner, [first]);
			savePlacements(sessionId, guest, [first]);
			addBar(sessionId, owner, typed("Second"));

			const [late] = await testDb
				.insert(users)
				.values({ email: "late@test.com" })
				.returning();
			await testDb
				.insert(sessionUsers)
				.values({ sessionId, userId: late.id, active: true });

			const list = await getPersonalBarList(sessionId, late.id);

			expect(list.bars.map((b) => b.name)).toEqual(["Second"]);
			expect(list.hasPlacedCurrent).toBe(false);
		});
	});

	describe("correcting bars", () => {
		it("links a typed bar to a venue and keeps its placements", async () => {
			addBar(sessionId, owner, typed("bar a"));
			const id = barId("bar a");
			savePlacements(sessionId, owner, [id]);

			const result = correctBar(sessionId, id, venue("Bar A", "fsq1"));

			expect(result).toEqual({ ok: true });
			const list = await getPersonalBarList(sessionId, owner);
			expect(list.bars[0]).toMatchObject({
				name: "Bar A",
				foursquareId: "fsq1",
			});
		});

		it("rejects a venue already on the list", () => {
			addBar(sessionId, owner, venue("Café Bar A", "fsq1"));
			addBar(sessionId, owner, typed("bar a"));

			const result = correctBar(
				sessionId,
				barId("bar a"),
				venue("Café Bar A", "fsq1"),
			);

			expect(result).toMatchObject({ ok: false, status: 409 });
		});

		it("rejects a bar that already has a venue", () => {
			addBar(sessionId, owner, venue("Bar A", "fsq1"));

			expect(
				correctBar(sessionId, barId("Bar A"), venue("Bar B", "fsq2")),
			).toMatchObject({ ok: false, status: 409 });
		});

		it("requires a venue", () => {
			addBar(sessionId, owner, typed("bar a"));

			expect(
				correctBar(sessionId, barId("bar a"), typed("Bar A")),
			).toMatchObject({ ok: false, status: 400 });
		});
	});

	describe("removing bars", () => {
		const asOwner = () => ({ id: owner, admin: false });
		const asGuest = () => ({ id: guest, admin: false });

		it("lets the person who added it remove it until someone places it", () => {
			addBar(sessionId, guest, typed("Mine"));
			const id = barId("Mine");
			savePlacements(sessionId, owner, [id]);

			expect(removeBar(sessionId, id, asGuest())).toMatchObject({
				ok: false,
				status: 409,
			});

			addBar(sessionId, guest, typed("Queued"));
			expect(removeBar(sessionId, barId("Queued"), asGuest())).toEqual({
				ok: true,
			});
		});

		it("doesn't let others remove it", () => {
			addBar(sessionId, owner, typed("Theirs"));

			expect(removeBar(sessionId, barId("Theirs"), asGuest())).toMatchObject({
				ok: false,
				status: 403,
			});
		});

		it("lets the owner remove a placed bar and opens the next one", async () => {
			addBar(sessionId, guest, typed("Duplicate"));
			addBar(sessionId, guest, typed("Next"));
			const id = barId("Duplicate");
			savePlacements(sessionId, guest, [id]);

			expect(removeBar(sessionId, id, asOwner())).toEqual({ ok: true });

			expect(statuses()).toEqual([
				{ name: "Next", status: SessionBeerStatus.rating },
			]);
			const list = await getPersonalBarList(sessionId, guest);
			expect(list.bars.map((b) => b.name)).toEqual(["Next"]);
		});

		it("doesn't let anyone remove a finished bar", () => {
			addBar(sessionId, owner, typed("Finished"));
			const id = barId("Finished");
			savePlacements(sessionId, owner, [id]);
			savePlacements(sessionId, guest, [id]);

			for (const actor of [asOwner(), { id: guest, admin: true }]) {
				expect(removeBar(sessionId, id, actor)).toMatchObject({
					ok: false,
					status: 409,
				});
			}
			expect(statuses()).toHaveLength(1);
		});

		it("continues the queue order after a removal", () => {
			addBar(sessionId, owner, typed("First"));
			addBar(sessionId, owner, typed("Second"));
			removeBar(sessionId, barId("Second"), asOwner());
			addBar(sessionId, owner, typed("Third"));

			expect(statuses().map((b) => b.name)).toEqual(["First", "Third"]);
		});
	});

	describe("shared queue", () => {
		const addOpenAndThreeQueued = () => {
			addBar(sessionId, owner, typed("Open"));
			addBar(sessionId, owner, typed("B"));
			addBar(sessionId, owner, typed("C"));
			addBar(sessionId, owner, typed("D"));
		};

		it("lets anyone remove a queued bar", () => {
			addOpenAndThreeQueued();

			expect(
				removeBar(sessionId, barId("C"), { id: guest, admin: false }),
			).toEqual({ ok: true });
			expect(statuses().map((b) => b.name)).toEqual(["Open", "B", "D"]);
		});

		it("still protects the open bar from people who didn't add it", () => {
			addOpenAndThreeQueued();

			expect(
				removeBar(sessionId, barId("Open"), { id: guest, admin: false }),
			).toMatchObject({ ok: false, status: 403 });
		});

		it("lets anyone choose which bar opens next", () => {
			addOpenAndThreeQueued();

			const result = reorderQueue(sessionId, [
				barId("D"),
				barId("B"),
				barId("C"),
			]);

			expect(result).toEqual({ ok: true });

			const open = barId("Open");
			savePlacements(sessionId, owner, [open]);
			savePlacements(sessionId, guest, [open]);

			expect(statuses()).toEqual([
				{ name: "Open", status: SessionBeerStatus.rated },
				{ name: "D", status: SessionBeerStatus.rating },
				{ name: "B", status: SessionBeerStatus.waiting },
				{ name: "C", status: SessionBeerStatus.waiting },
			]);
		});

		it("adds new bars to the end after a reorder", () => {
			addOpenAndThreeQueued();
			reorderQueue(sessionId, [barId("D"), barId("C"), barId("B")]);

			addBar(sessionId, guest, typed("E"));

			expect(statuses().map((b) => b.name)).toEqual([
				"Open",
				"D",
				"C",
				"B",
				"E",
			]);
		});

		it("rejects a list that doesn't match the queue", () => {
			addOpenAndThreeQueued();
			const [b, c, d] = [barId("B"), barId("C"), barId("D")];

			for (const list of [
				[b, c],
				[b, c, c],
				[b, c, barId("Open")],
				[b, c, d, 99],
			]) {
				expect(reorderQueue(sessionId, list)).toMatchObject({
					ok: false,
					status: 409,
				});
			}
		});
	});

	describe("group ranking", () => {
		it("ranks finished bars", async () => {
			addBar(sessionId, owner, typed("First"));
			const first = barId("First");
			savePlacements(sessionId, owner, [first]);
			savePlacements(sessionId, guest, [first]);

			addBar(sessionId, owner, typed("Second"));
			const second = barId("Second");
			savePlacements(sessionId, owner, [second, first]);
			savePlacements(sessionId, guest, [second, first]);

			addBar(sessionId, owner, typed("Open"));
			savePlacements(sessionId, owner, [barId("Open"), second, first]);

			const ranking = await getOneBeerRanking(sessionId);

			expect(
				ranking.rankedBars.map((b) => [b.name, b.averagePosition]),
			).toEqual([
				["Second", 1],
				["First", 2],
			]);
			expect(ranking.currentBar).toMatchObject({
				name: "Open",
				placedCount: 1,
				expectedCount: 2,
			});
			expect(ranking.beer?.name).toBe("Stout");
			expect(ranking.personalPlacements).toEqual([
				{ userId: owner, positions: { [second]: 1, [first]: 2 } },
				{ userId: guest, positions: { [second]: 1, [first]: 2 } },
			]);
		});
	});
});
