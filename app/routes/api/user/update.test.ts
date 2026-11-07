import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestDb, resetTestDb } from "../../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

let currentUser: { id: number; admin: boolean; name?: string } | null = null;
vi.mock("~/auth/users.server", () => ({
	userSessionGet: async () => currentUser,
}));

const update = await import("./update");
const { users } = await import("~/database/schema.server");

async function respond(name?: string) {
	const body = new FormData();
	if (name !== undefined) body.append("name", name);

	let result: unknown;
	try {
		result = await update.action({
			request: new Request("http://test.local/", { method: "POST", body }),
			params: {},
		} as never);
	} catch (thrown) {
		result = thrown;
	}

	const { data, init } = result as {
		data?: { success?: boolean; message?: string };
		init?: { status?: number } | null;
	};
	return { status: init?.status ?? 200, ...data };
}

describe("updating your name", () => {
	beforeEach(async () => {
		resetTestDb(testDb);
		const [user] = await testDb
			.insert(users)
			.values({ email: "a@test.com" })
			.returning();
		currentUser = { id: user.id, admin: false };
	});

	const storedName = async () =>
		(
			await testDb.query.users.findFirst({
				where: eq(users.id, currentUser?.id ?? 0),
			})
		)?.name;

	it("stores the trimmed name", async () => {
		const { status, success } = await respond("  Jacob  ");

		expect(status).toBe(200);
		expect(success).toBe(true);
		expect(await storedName()).toBe("Jacob");
	});

	it.each([
		["a missing name", undefined],
		["a blank name", "   "],
		["a name over 50 characters", "x".repeat(51)],
	])("rejects %s with a 400", async (_, name) => {
		expect((await respond(name)).status).toBe(400);
		expect(await storedName()).toBeNull();
	});

	it("requires login", async () => {
		currentUser = null;

		expect((await respond("Jacob")).status).toBe(401);
	});
});
