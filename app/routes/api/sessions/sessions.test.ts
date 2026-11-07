import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionMode, SessionStatus } from "~/types/session";

import { createTestDb, resetTestDb } from "../../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));
vi.mock("~/utils/websocket.server", () => ({
	emitGlobalEvent: vi.fn(),
	emitSessionEvent: vi.fn(),
}));

let currentUser: { id: number; admin: boolean } | null = null;
vi.mock("~/auth/users.server", () => ({
	userSessionGet: async () => currentUser,
}));

const createSession = await import("./sessions");
const addBeers = await import("./session/add");
const { criteria, sessions, sessionState, sessionUsers, users } = await import(
	"~/database/schema.server"
);

const beer = (untappdBeerId: number, abv = 5) => ({
	untappdBeerId: String(untappdBeerId),
	name: `Beer ${untappdBeerId}`,
	breweryName: "Brewery",
	abv,
	style: "IPA",
	label: "label.png",
});

type Action = { action: (args: never) => Promise<unknown> };

async function respond(
	route: Action,
	form: Record<string, string>,
	params: Record<string, string> = {},
) {
	const body = new FormData();
	for (const [key, value] of Object.entries(form)) body.append(key, value);

	let result: unknown;
	try {
		result = await route.action({
			request: new Request("http://test.local/", { method: "POST", body }),
			params,
		} as never);
	} catch (thrown) {
		result = thrown;
	}

	if (result instanceof Response) {
		return { status: result.status, location: result.headers.get("Location") };
	}

	const { data, init } = result as {
		data?: { message?: string };
		init?: { status?: number } | null;
	};
	return { status: init?.status ?? 200, message: data?.message };
}

let criterionId: number;
let disabledCriterionId: number;

beforeEach(async () => {
	resetTestDb(testDb);

	const [user] = await testDb
		.insert(users)
		.values({ email: "a@test.com" })
		.returning();
	currentUser = { id: user.id, admin: false };

	const [enabled, disabled] = await testDb
		.insert(criteria)
		.values([
			{ name: "Smag", description: "", weight: 1 },
			{ name: "Gammel", description: "", weight: 1, enabled: false },
		])
		.returning();
	criterionId = enabled.id;
	disabledCriterionId = disabled.id;
});

const normalSession = (overrides: Record<string, string> = {}) => ({
	name: "Fredagsbar",
	mode: SessionMode.normal,
	criteria: JSON.stringify([criterionId]),
	beers: "[]",
	...overrides,
});

describe("creating a session", () => {
	it("creates a normal session with a 0% beer", async () => {
		const { status, location } = await respond(
			createSession,
			normalSession({ beers: JSON.stringify([beer(1, 0)]) }),
		);

		expect(status).toBe(302);
		const created = await testDb.query.sessions.findFirst();
		expect(location).toBe(`/sessions/${created?.id}`);

		const added = await testDb.query.sessionBeers.findMany({
			with: { beer: true },
		});
		expect(added.map((sb) => sb.beer.abv)).toEqual([0]);
	});

	it("creates a One Beer session with its beer", async () => {
		const { status } = await respond(createSession, {
			name: "Crawl",
			mode: SessionMode.oneBeer,
			beers: JSON.stringify([beer(1)]),
		});

		expect(status).toBe(302);
		const created = await testDb.query.sessions.findFirst();
		expect(created?.mode).toBe(SessionMode.oneBeer);
		expect(created?.beerId).not.toBeNull();
	});

	it.each([
		["an empty name", normalSession({ name: "  " })],
		["an unknown mode", normalSession({ mode: "party" })],
		["no criteria", normalSession({ criteria: "[]" })],
		["a duplicate criterion", normalSession({ criteria: "[1,1]" })],
		["criteria that aren't JSON", normalSession({ criteria: "{nope" })],
		["a beer without an ABV", normalSession({ beers: '[{"name":"x"}]' })],
		[
			"a One Beer session without its beer",
			{ name: "Crawl", mode: SessionMode.oneBeer, beers: "[]" },
		],
	])("rejects %s with a 400 and creates nothing", async (_, form) => {
		expect((await respond(createSession, form)).status).toBe(400);
		expect(await testDb.query.sessions.findMany()).toHaveLength(0);
	});

	it("rejects a disabled criterion", async () => {
		const { status } = await respond(
			createSession,
			normalSession({ criteria: JSON.stringify([disabledCriterionId]) }),
		);

		expect(status).toBe(400);
	});

	it("rejects a name that's taken, ignoring case", async () => {
		await respond(createSession, normalSession());

		const { status, message } = await respond(
			createSession,
			normalSession({ name: "FREDAGSBAR" }),
		);

		expect(status).toBe(400);
		expect(message).toBe("Der findes allerede en smagning med det navn");
	});
});

describe("adding beers", () => {
	let sessionId: number;

	beforeEach(async () => {
		const [session] = await testDb
			.insert(sessions)
			.values({ name: "S", joinCode: "ABC12", createdBy: currentUser?.id ?? 0 })
			.returning();
		sessionId = session.id;
		await testDb
			.insert(sessionState)
			.values({ sessionId, status: SessionStatus.created });
		await testDb
			.insert(sessionUsers)
			.values({ sessionId, userId: currentUser?.id ?? 0, active: true });
	});

	const add = (beers: string) =>
		respond(addBeers, { beers }, { sessionId: String(sessionId) });

	const beerCount = async () =>
		(
			await testDb.query.sessionBeers.findMany({
				where: (sb) => eq(sb.sessionId, sessionId),
			})
		).length;

	it("adds valid beers, including a 0% one", async () => {
		expect((await add(JSON.stringify([beer(1), beer(2, 0)]))).status).toBe(200);
		expect(await beerCount()).toBe(2);
	});

	it("rejects the whole batch when one beer is invalid", async () => {
		const { status } = await add(
			JSON.stringify([beer(1), { ...beer(2), abv: null }]),
		);

		expect(status).toBe(400);
		expect(await beerCount()).toBe(0);
	});

	it.each([
		["no beers", "[]"],
		["a body that isn't JSON", "{nope"],
	])("rejects %s with a 400", async (_, beers) => {
		expect((await add(beers)).status).toBe(400);
	});
});
