import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionStatus } from "~/types/session";

import { createTestDb, resetTestDb } from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const { finishSessions } = await import("./finishSessions.server");
const { beers, sessionState, sessions, sessionUsers, users } = await import(
	"../schema.server"
);

describe("finishSessions", () => {
	let userId: number;
	let beerId: number;

	const seedSession = async (name: string, joinCode: string) => {
		const [session] = await testDb
			.insert(sessions)
			.values({ name, joinCode, createdBy: userId })
			.returning();
		await testDb.insert(sessionState).values({
			sessionId: session.id,
			status: SessionStatus.active,
			currentBeerId: beerId,
			currentBeerOrder: 1,
		});
		await testDb
			.insert(sessionUsers)
			.values({ sessionId: session.id, userId, active: true });

		return session.id;
	};

	const stateOf = (sessionId: number) =>
		testDb.query.sessionState.findFirst({
			where: eq(sessionState.sessionId, sessionId),
		});

	const membershipOf = (sessionId: number) =>
		testDb.query.sessionUsers.findFirst({
			where: eq(sessionUsers.sessionId, sessionId),
		});

	beforeEach(async () => {
		resetTestDb(testDb);

		const [user] = await testDb
			.insert(users)
			.values({ email: "a@test.com" })
			.returning();
		userId = user.id;

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
		beerId = beer.id;
	});

	it("finishes the session and clears the current beer", async () => {
		const id = await seedSession("One", "AAAAA");

		finishSessions([id]);

		expect(await stateOf(id)).toMatchObject({
			status: SessionStatus.finished,
			currentBeerId: null,
			currentBeerOrder: null,
		});
	});

	it("takes people out without marking them as having left", async () => {
		const id = await seedSession("One", "AAAAA");

		finishSessions([id]);

		expect(await membershipOf(id)).toMatchObject({
			active: false,
			exitReason: null,
		});
	});

	it("leaves other sessions alone", async () => {
		const id = await seedSession("One", "AAAAA");
		const otherId = await seedSession("Two", "BBBBB");

		finishSessions([id]);

		expect((await stateOf(otherId))?.status).toBe(SessionStatus.active);
		expect((await membershipOf(otherId))?.active).toBe(true);
	});

	it("does nothing with an empty list", async () => {
		const id = await seedSession("One", "AAAAA");

		finishSessions([]);

		expect((await stateOf(id))?.status).toBe(SessionStatus.active);
	});
});
