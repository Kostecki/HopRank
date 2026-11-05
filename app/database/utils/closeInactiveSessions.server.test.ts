import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionStatus } from "~/types/session";

import { createTestDb, resetTestDb } from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const { closeInactiveSessions } = await import(
	"./closeInactiveSessions.server"
);
const { users, sessions, sessionState, sessionUsers } = await import(
	"../schema.server"
);

async function seedActiveSession(createdAt: string, lastUpdatedAt: string) {
	const [user] = await testDb
		.insert(users)
		.values({ email: "a@test.com" })
		.returning();
	const [session] = await testDb
		.insert(sessions)
		.values({
			name: "Test Session",
			joinCode: "ABC12",
			createdBy: user.id,
			createdAt,
		})
		.returning();
	await testDb.insert(sessionState).values({
		sessionId: session.id,
		status: SessionStatus.active,
		lastUpdatedAt,
	});
	await testDb
		.insert(sessionUsers)
		.values({ sessionId: session.id, userId: user.id, active: true });

	return session.id;
}

const statusOf = async (sessionId: number) => {
	const state = await testDb.query.sessionState.findFirst({
		where: eq(sessionState.sessionId, sessionId),
	});
	return state?.status;
};

describe("closeInactiveSessions", () => {
	beforeEach(() => {
		resetTestDb(testDb);
		// Default limits: older than 24 hours and idle for more than 6 hours.
		// Timestamps below use SQLite's CURRENT_TIMESTAMP format.
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-11-05T12:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("closes a session that is old and idle", async () => {
		const id = await seedActiveSession(
			"2026-11-03 12:00:00",
			"2026-11-05 05:00:00",
		);

		await closeInactiveSessions();

		expect(await statusOf(id)).toBe(SessionStatus.finished);
	});

	it("keeps an old session with activity later on the same date as the idle cutoff", async () => {
		const id = await seedActiveSession(
			"2026-11-03 12:00:00",
			"2026-11-05 11:30:00",
		);

		await closeInactiveSessions();

		expect(await statusOf(id)).toBe(SessionStatus.active);
	});

	it("keeps an idle session created later on the same date as the age cutoff", async () => {
		const id = await seedActiveSession(
			"2026-11-04 13:00:00",
			"2026-11-05 01:00:00",
		);

		await closeInactiveSessions();

		expect(await statusOf(id)).toBe(SessionStatus.active);
	});
});
