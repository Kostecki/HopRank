import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	createTestDb,
	resetTestDb,
	type TestDb,
} from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const {
	isActiveSessionParticipant,
	requireSessionParticipant,
	requireSessionOwnerOrAdmin,
	requireSessionRejoinEligible,
} = await import("./assertSessionAccess.server");
const { users, sessions, sessionUsers } = await import("../schema.server");

// `data()` from react-router returns a `DataWithResponseInit` (not a real
// Response) shaped as `{ type, data, init }` — check that shape directly
// rather than importing router internals.
async function expect403(promiseOrFn: Promise<unknown> | (() => unknown)) {
	try {
		if (typeof promiseOrFn === "function") {
			promiseOrFn();
		} else {
			await promiseOrFn;
		}
		expect.fail("expected a 403 to be thrown");
	} catch (error) {
		const thrown = error as { init?: { status?: number } };
		expect(thrown.init?.status).toBe(403);
	}
}

describe("assertSessionAccess.server", () => {
	let db: TestDb;
	let ownerId: number;
	let memberId: number;
	let outsiderId: number;
	let adminOutsiderId: number;
	let sessionId: number;

	beforeEach(async () => {
		db = testDb;
		resetTestDb(db);

		const [owner] = await db
			.insert(users)
			.values({ email: "owner@test.com" })
			.returning();
		const [member] = await db
			.insert(users)
			.values({ email: "member@test.com" })
			.returning();
		const [outsider] = await db
			.insert(users)
			.values({ email: "outsider@test.com" })
			.returning();
		const [adminOutsider] = await db
			.insert(users)
			.values({ email: "admin@test.com", admin: true })
			.returning();

		ownerId = owner.id;
		memberId = member.id;
		outsiderId = outsider.id;
		adminOutsiderId = adminOutsider.id;

		const [session] = await db
			.insert(sessions)
			.values({ name: "Test Session", joinCode: "ABC12", createdBy: ownerId })
			.returning();
		sessionId = session.id;

		await db
			.insert(sessionUsers)
			.values({ sessionId, userId: ownerId, active: true });
		await db
			.insert(sessionUsers)
			.values({ sessionId, userId: memberId, active: true });
	});

	describe("isActiveSessionParticipant / requireSessionParticipant", () => {
		it("is true for an active participant", async () => {
			expect(await isActiveSessionParticipant(sessionId, memberId)).toBe(true);
			await expect(
				requireSessionParticipant(sessionId, memberId),
			).resolves.toBeUndefined();
		});

		it("is false for a non-member", async () => {
			expect(await isActiveSessionParticipant(sessionId, outsiderId)).toBe(
				false,
			);
			await expect403(requireSessionParticipant(sessionId, outsiderId));
		});

		it("is false for a member who has left (active: false)", async () => {
			await db
				.update(sessionUsers)
				.set({ active: false })
				.where(
					and(
						eq(sessionUsers.sessionId, sessionId),
						eq(sessionUsers.userId, memberId),
					),
				);

			expect(await isActiveSessionParticipant(sessionId, memberId)).toBe(false);
			await expect403(requireSessionParticipant(sessionId, memberId));
		});
	});

	describe("requireSessionOwnerOrAdmin", () => {
		it("passes for the session creator", () => {
			expect(() =>
				requireSessionOwnerOrAdmin(
					{ createdBy: ownerId },
					{ id: ownerId, admin: false },
				),
			).not.toThrow();
		});

		it("passes for an admin who did not create the session", () => {
			expect(() =>
				requireSessionOwnerOrAdmin(
					{ createdBy: ownerId },
					{ id: adminOutsiderId, admin: true },
				),
			).not.toThrow();
		});

		it("throws 403 for a non-owner, non-admin", async () => {
			await expect403(() =>
				requireSessionOwnerOrAdmin(
					{ createdBy: ownerId },
					{ id: memberId, admin: false },
				),
			);
		});
	});

	describe("requireSessionRejoinEligible", () => {
		it("passes for the session creator", async () => {
			await expect(
				requireSessionRejoinEligible(
					{ createdBy: ownerId },
					ownerId,
					sessionId,
				),
			).resolves.toBeUndefined();
		});

		it("passes for a prior member even if currently inactive", async () => {
			await db
				.update(sessionUsers)
				.set({ active: false })
				.where(
					and(
						eq(sessionUsers.sessionId, sessionId),
						eq(sessionUsers.userId, memberId),
					),
				);

			await expect(
				requireSessionRejoinEligible(
					{ createdBy: ownerId },
					memberId,
					sessionId,
				),
			).resolves.toBeUndefined();
		});

		it("throws 403 for someone with no session_users row and not the creator", async () => {
			await expect403(
				requireSessionRejoinEligible(
					{ createdBy: ownerId },
					outsiderId,
					sessionId,
				),
			);
		});
	});
});
