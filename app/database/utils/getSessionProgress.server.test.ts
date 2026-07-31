import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	createTestDb,
	resetTestDb,
	type TestDb,
} from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const { getSessionProgress, toSessionProgressUser } = await import(
	"./getSessionProgress.server"
);
const { users, sessions, sessionState, sessionUsers } = await import(
	"../schema.server"
);

describe("toSessionProgressUser", () => {
	it("never includes email or admin", () => {
		const projected = toSessionProgressUser(
			{
				id: 1,
				untappdId: null,
				name: "Alice",
				username: "alice",
				email: "alice@example.com",
				avatarURL: null,
				admin: true,
				createdAt: "2024-01-01",
				lastUpdatedAt: "2024-01-01",
			},
			{ active: true, exitReason: null },
		);

		expect(projected).toEqual({
			id: 1,
			name: "Alice",
			untappdId: null,
			username: "alice",
			avatarURL: null,
			status: "active",
		});
		expect(projected).not.toHaveProperty("email");
		expect(projected).not.toHaveProperty("admin");
	});

	it("derives status from active/exitReason", () => {
		const base = {
			id: 1,
			untappdId: null,
			name: "Alice",
			username: "alice",
			email: "alice@example.com",
			avatarURL: null,
			admin: false,
			createdAt: "2024-01-01",
			lastUpdatedAt: "2024-01-01",
		};

		expect(
			toSessionProgressUser(base, { active: false, exitReason: "left" }).status,
		).toBe("left");
		expect(
			toSessionProgressUser(base, { active: false, exitReason: "kicked" })
				.status,
		).toBe("kicked");
		expect(toSessionProgressUser(base, undefined).status).toBe("active");
	});
});

describe("getSessionProgress", () => {
	let db: TestDb;

	beforeEach(() => {
		db = testDb;
		resetTestDb(db);
	});

	it("does not leak email/admin on SessionProgress.users, even for an unauthenticated caller", async () => {
		const [alice] = await db
			.insert(users)
			.values({ email: "alice@example.com", name: "Alice", admin: true })
			.returning();
		const [bob] = await db
			.insert(users)
			.values({ email: "bob@example.com", name: "Bob" })
			.returning();

		const [session] = await db
			.insert(sessions)
			.values({ name: "Test Session", joinCode: "ABC12", createdBy: alice.id })
			.returning();
		await db.insert(sessionState).values({ sessionId: session.id });
		await db.insert(sessionUsers).values([
			{ sessionId: session.id, userId: alice.id, active: true },
			{ sessionId: session.id, userId: bob.id, active: true },
		]);

		// Unauthenticated request, matching the public /sessions/:id/view route.
		const result = await getSessionProgress({
			request: new Request("http://localhost/test"),
			sessionId: session.id,
		});

		expect("statusCode" in result).toBe(false);
		if ("statusCode" in result) return;

		expect(result.users).toHaveLength(2);
		for (const user of result.users) {
			expect(user).not.toHaveProperty("email");
			expect(user).not.toHaveProperty("admin");
			expect(Object.keys(user).sort()).toEqual(
				["avatarURL", "id", "name", "status", "untappdId", "username"].sort(),
			);
		}
	});

	it("keeps a kicked/left participant visible even if they never added a beer or voted", async () => {
		const [alice] = await db
			.insert(users)
			.values({ email: "alice@example.com", name: "Alice" })
			.returning();
		const [bob] = await db
			.insert(users)
			.values({ email: "bob@example.com", name: "Bob" })
			.returning();

		const [session] = await db
			.insert(sessions)
			.values({ name: "Test Session", joinCode: "ABC13", createdBy: alice.id })
			.returning();
		await db.insert(sessionState).values({ sessionId: session.id });
		await db.insert(sessionUsers).values([
			{ sessionId: session.id, userId: alice.id, active: true },
			// Bob was kicked before ever adding a beer or voting.
			{
				sessionId: session.id,
				userId: bob.id,
				active: false,
				exitReason: "kicked",
			},
		]);

		const result = await getSessionProgress({
			request: new Request("http://localhost/test"),
			sessionId: session.id,
		});

		expect("statusCode" in result).toBe(false);
		if ("statusCode" in result) return;

		const bobEntry = result.users.find((u) => u.id === bob.id);
		expect(bobEntry).toBeDefined();
		expect(bobEntry?.status).toBe("kicked");
	});

	it("returns a 404 shape for an unknown session", async () => {
		const result = await getSessionProgress({
			request: new Request("http://localhost/test"),
			sessionId: 999999,
		});

		expect(result).toEqual({ statusCode: 404, error: "Session not found" });
	});
});
