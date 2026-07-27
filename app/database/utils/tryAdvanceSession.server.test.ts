import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionBeerStatus, SessionStatus } from "~/types/session";

import {
	createTestDb,
	resetTestDb,
	type TestDb,
} from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const { tryAdvanceSession } = await import("./tryAdvanceSession.server");
const {
	users,
	sessions,
	sessionUsers,
	beers,
	sessionBeers,
	criteria,
	sessionCriteria,
	sessionState,
	ratings,
} = await import("../schema.server");

async function seedInProgressSession(db: TestDb) {
	const [userA, userB, userC] = await db
		.insert(users)
		.values([
			{ email: "a@test.com" },
			{ email: "b@test.com" },
			{ email: "c@test.com" },
		])
		.returning();

	const [criterion] = await db
		.insert(criteria)
		.values({ name: "Rating", description: "desc", weight: 1 })
		.returning();

	const [session] = await db
		.insert(sessions)
		.values({ name: "Test Session", joinCode: "ABC12", createdBy: userA.id })
		.returning();

	await db.insert(sessionCriteria).values({
		sessionId: session.id,
		criterionId: criterion.id,
	});

	await db.insert(sessionUsers).values([
		{ sessionId: session.id, userId: userA.id, active: true },
		{ sessionId: session.id, userId: userB.id, active: true },
		{ sessionId: session.id, userId: userC.id, active: true },
	]);

	const [beer1, beer2] = await db
		.insert(beers)
		.values([
			{
				untappdBeerId: 1,
				name: "Beer One",
				breweryName: "Brewery",
				style: "IPA",
				label: "label.png",
			},
			{
				untappdBeerId: 2,
				name: "Beer Two",
				breweryName: "Brewery",
				style: "Stout",
				label: "label.png",
			},
		])
		.returning();

	const [sessionBeer1] = await db
		.insert(sessionBeers)
		.values({
			sessionId: session.id,
			beerId: beer1.id,
			addedByUserId: userA.id,
			order: 0,
			status: SessionBeerStatus.rating,
		})
		.returning();
	await db.insert(sessionBeers).values({
		sessionId: session.id,
		beerId: beer2.id,
		addedByUserId: userA.id,
		order: 1,
		status: SessionBeerStatus.waiting,
	});

	await db.insert(sessionState).values({
		sessionId: session.id,
		currentBeerId: beer1.id,
		currentBeerOrder: 0,
		status: SessionStatus.active,
	});

	return {
		userA,
		userB,
		userC,
		criterion,
		session,
		beer1,
		beer2,
		sessionBeer1,
	};
}

async function vote(
	db: TestDb,
	sessionId: number,
	beerId: number,
	userId: number,
	criterionId: number,
) {
	await db
		.insert(ratings)
		.values({ sessionId, beerId, userId, criterionId, score: 4 });
}

describe("tryAdvanceSession", () => {
	let db: TestDb;

	beforeEach(() => {
		db = testDb;
		resetTestDb(db);
	});

	it("does not advance while some active users have not voted", async () => {
		const { userA, userB, criterion, session, beer1 } =
			await seedInProgressSession(db);

		await vote(db, session.id, beer1.id, userA.id, criterion.id);
		await vote(db, session.id, beer1.id, userB.id, criterion.id);
		// userC never votes

		await tryAdvanceSession(session.id);

		const beer1Row = db
			.select()
			.from(sessionBeers)
			.where(eq(sessionBeers.beerId, beer1.id))
			.get();
		expect(beer1Row?.status).toBe(SessionBeerStatus.rating);

		const state = db
			.select()
			.from(sessionState)
			.where(eq(sessionState.sessionId, session.id))
			.get();
		expect(state?.currentBeerId).toBe(beer1.id);
	});

	it("advances to the next beer once every active user has voted", async () => {
		const { userA, userB, userC, criterion, session, beer1, beer2 } =
			await seedInProgressSession(db);

		await vote(db, session.id, beer1.id, userA.id, criterion.id);
		await vote(db, session.id, beer1.id, userB.id, criterion.id);
		await vote(db, session.id, beer1.id, userC.id, criterion.id);

		await tryAdvanceSession(session.id);

		const beer1Row = db
			.select()
			.from(sessionBeers)
			.where(eq(sessionBeers.beerId, beer1.id))
			.get();
		expect(beer1Row?.status).toBe(SessionBeerStatus.rated);

		const beer2Row = db
			.select()
			.from(sessionBeers)
			.where(eq(sessionBeers.beerId, beer2.id))
			.get();
		expect(beer2Row?.status).toBe(SessionBeerStatus.rating);

		const state = db
			.select()
			.from(sessionState)
			.where(eq(sessionState.sessionId, session.id))
			.get();
		expect(state?.currentBeerId).toBe(beer2.id);
	});

	it("regression: does not advance early when a voter leaves mid-vote, inflating the old raw-count check", async () => {
		const { userA, userB, criterion, session, beer1 } =
			await seedInProgressSession(db);

		// A and B vote, then B leaves. C is still active but has not voted.
		// The old check (submittedRatings.length >= activeUsers.length *
		// criteria.length) would read 2 >= 2 (2 active users left: A, C) and
		// wrongly advance, even though C never voted.
		await vote(db, session.id, beer1.id, userA.id, criterion.id);
		await vote(db, session.id, beer1.id, userB.id, criterion.id);
		await db
			.update(sessionUsers)
			.set({ active: false })
			.where(
				and(
					eq(sessionUsers.sessionId, session.id),
					eq(sessionUsers.userId, userB.id),
				),
			);

		await tryAdvanceSession(session.id);

		const beer1Row = db
			.select()
			.from(sessionBeers)
			.where(eq(sessionBeers.beerId, beer1.id))
			.get();
		expect(beer1Row?.status).toBe(SessionBeerStatus.rating);
	});

	it("clears currentBeerId when the last beer is rated", async () => {
		const { userA, userB, userC, criterion, session, beer1, beer2 } =
			await seedInProgressSession(db);

		// Rate beer1 to advance to beer2.
		await vote(db, session.id, beer1.id, userA.id, criterion.id);
		await vote(db, session.id, beer1.id, userB.id, criterion.id);
		await vote(db, session.id, beer1.id, userC.id, criterion.id);
		await tryAdvanceSession(session.id);

		// Now rate beer2 (the only remaining beer).
		await vote(db, session.id, beer2.id, userA.id, criterion.id);
		await vote(db, session.id, beer2.id, userB.id, criterion.id);
		await vote(db, session.id, beer2.id, userC.id, criterion.id);
		await tryAdvanceSession(session.id);

		const beer2Row = db
			.select()
			.from(sessionBeers)
			.where(eq(sessionBeers.beerId, beer2.id))
			.get();
		expect(beer2Row?.status).toBe(SessionBeerStatus.rated);

		const state = db
			.select()
			.from(sessionState)
			.where(eq(sessionState.sessionId, session.id))
			.get();
		expect(state?.currentBeerId).toBeNull();
	});

	it("does nothing for an abandoned session with zero active users", async () => {
		const { session, beer1 } = await seedInProgressSession(db);

		await db
			.update(sessionUsers)
			.set({ active: false })
			.where(eq(sessionUsers.sessionId, session.id));

		await tryAdvanceSession(session.id);

		const beer1Row = db
			.select()
			.from(sessionBeers)
			.where(eq(sessionBeers.beerId, beer1.id))
			.get();
		expect(beer1Row?.status).toBe(SessionBeerStatus.rating);
	});
});
