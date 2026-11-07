import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionUserExitReason } from "~/types/session";

import { createTestDb, resetTestDb } from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const { joinSessionById } = await import("./joinSessionById.server");
const { users, sessions, sessionUsers } = await import("../schema.server");

describe("joinSessionById", () => {
	let userId: number;
	let activeSessionId: number;
	let kickedSessionId: number;
	let finishedSessionId: number;
	let newSessionId: number;

	beforeEach(async () => {
		resetTestDb(testDb);

		const [user] = await testDb
			.insert(users)
			.values({ email: "a@test.com" })
			.returning();
		userId = user.id;

		const created = await testDb
			.insert(sessions)
			.values(
				["A", "B", "C", "D"].map((name, i) => ({
					name,
					joinCode: `CODE${i}`,
					createdBy: userId,
				})),
			)
			.returning();
		[activeSessionId, kickedSessionId, finishedSessionId, newSessionId] =
			created.map((s) => s.id);

		await testDb.insert(sessionUsers).values([
			{ sessionId: activeSessionId, userId, active: true },
			{
				sessionId: kickedSessionId,
				userId,
				active: false,
				exitReason: SessionUserExitReason.kicked,
			},
			{ sessionId: finishedSessionId, userId, active: false },
		]);
	});

	const membershipIn = async (sessionId: number) =>
		(
			await testDb.query.sessionUsers.findMany({
				where: (su, { and, eq }) =>
					and(eq(su.sessionId, sessionId), eq(su.userId, userId)),
			})
		)[0];

	it("leaves the current session and keeps other memberships as they were", async () => {
		await joinSessionById({ sessionId: newSessionId, userId });

		expect(await membershipIn(activeSessionId)).toMatchObject({
			active: false,
			exitReason: SessionUserExitReason.left,
		});
		expect(await membershipIn(kickedSessionId)).toMatchObject({
			active: false,
			exitReason: SessionUserExitReason.kicked,
		});
		expect(await membershipIn(finishedSessionId)).toMatchObject({
			active: false,
			exitReason: null,
		});
		expect(await membershipIn(newSessionId)).toMatchObject({
			active: true,
			exitReason: null,
		});
	});
});
