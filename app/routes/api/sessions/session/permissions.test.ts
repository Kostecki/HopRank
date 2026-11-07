import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionBeerStatus, SessionMode, SessionStatus } from "~/types/session";

import { createTestDb, resetTestDb } from "../../../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));
vi.mock("~/utils/websocket.server", () => ({
	emitGlobalEvent: vi.fn(),
	emitSessionEvent: vi.fn(),
}));

type TestUser = {
	id: number;
	admin: boolean;
	untappd?: { accessToken: string };
};
let currentUser: TestUser | null = null;
vi.mock("~/auth/users.server", () => ({
	userSessionGet: async () => currentUser,
}));

const add = await import("./add");
const bar = await import("./bar");
const bars = await import("./bars");
const barsSync = await import("./barsSync");
const finish = await import("./finish");
const kick = await import("./kick");
const placements = await import("./placements");
const remove = await import("./remove");
const start = await import("./start");
const vote = await import("./vote");
const {
	beers,
	criteria,
	sessionBars,
	sessionCriteria,
	sessionState,
	sessions,
	sessionUsers,
	users,
} = await import("~/database/schema.server");

type Action = { action: (args: never) => Promise<unknown> };

/**
 * What a route responds with. Access checks throw their response and the rest
 * return it, so this treats both the same.
 */
async function respond(
	route: Action,
	options: {
		method?: string;
		form?: Record<string, string>;
		params?: Record<string, string>;
	} = {},
) {
	const body = new FormData();
	for (const [key, value] of Object.entries(options.form ?? {})) {
		body.append(key, value);
	}

	const request = new Request("http://test.local/", {
		method: options.method ?? "POST",
		body,
	});

	let result: unknown;
	try {
		result = await route.action({
			request,
			params: { sessionId: String(sessionId), ...options.params },
		} as never);
	} catch (thrown) {
		result = thrown;
	}

	const { data, init } = result as {
		data?: { message?: string };
		init?: { status?: number } | null;
	};

	return { status: init?.status ?? 200, message: data?.message };
}

const statusOf = async (...args: Parameters<typeof respond>) =>
	(await respond(...args)).status;

const ONE_BEER_REJECTION = "Det kan man ikke i en One Beer-smagning";

let sessionId: number;
let owner: TestUser;
let participant: TestUser;
let outsider: TestUser;
let admin: TestUser;
let openBarId: number;
let beerId: number;

const setMode = (mode: SessionMode) =>
	testDb.update(sessions).set({ mode }).where(eq(sessions.id, sessionId));

const setStatus = (status: string) =>
	testDb
		.update(sessionState)
		.set({ status })
		.where(eq(sessionState.sessionId, sessionId));

const statusInDb = async () =>
	(
		await testDb.query.sessionState.findFirst({
			where: eq(sessionState.sessionId, sessionId),
		})
	)?.status;

beforeEach(async () => {
	resetTestDb(testDb);

	const [a, b, c, d] = await testDb
		.insert(users)
		.values([
			{ email: "owner@test.com" },
			{ email: "participant@test.com" },
			{ email: "outsider@test.com" },
			{ email: "admin@test.com", admin: true },
		])
		.returning();
	owner = { id: a.id, admin: false };
	participant = { id: b.id, admin: false };
	outsider = { id: c.id, admin: false };
	admin = { id: d.id, admin: true };

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

	const [session] = await testDb
		.insert(sessions)
		.values({
			name: "Crawl",
			joinCode: "ABC12",
			createdBy: owner.id,
			mode: SessionMode.oneBeer,
			beerId: beer.id,
		})
		.returning();
	sessionId = session.id;

	await testDb
		.insert(sessionState)
		.values({ sessionId, status: SessionStatus.active });
	await testDb.insert(sessionUsers).values([
		{ sessionId, userId: owner.id, active: true },
		{ sessionId, userId: participant.id, active: true },
	]);

	const [openBar] = await testDb
		.insert(sessionBars)
		.values({
			sessionId,
			name: "Open",
			addedByUserId: owner.id,
			order: 1,
			status: SessionBeerStatus.rating,
		})
		.returning();
	openBarId = openBar.id;

	currentUser = owner;
});

const newBar = { bar: JSON.stringify({ name: "New", foursquareId: null }) };

describe("session API permissions", () => {
	describe("when not logged in", () => {
		it.each([
			["finish", finish, {}],
			["start", start, {}],
			["add a bar", bars, { form: newBar }],
			["save placements", placements, { form: { barIds: "[]" } }],
			["sync venues", barsSync, { form: { venues: "[]" } }],
		] as const)("can't %s", async (_, route, options) => {
			currentUser = null;

			expect(await statusOf(route, options)).toBe(401);
		});

		it("can't change a bar", async () => {
			currentUser = null;

			expect(
				await statusOf(bar, {
					method: "DELETE",
					params: { barId: String(openBarId) },
				}),
			).toBe(401);
		});
	});

	describe("when not part of the session", () => {
		it.each([
			["add a bar", bars, { form: newBar }],
			["reorder bars", bars, { method: "PATCH", form: { barIds: "[]" } }],
			["save placements", placements, { form: { barIds: "[1]" } }],
			["sync venues", barsSync, { form: { venues: "[]" } }],
		] as const)("can't %s", async (_, route, options) => {
			currentUser = outsider;

			expect(await statusOf(route, options)).toBe(403);
		});

		it("can't remove a bar", async () => {
			currentUser = outsider;

			expect(
				await statusOf(bar, {
					method: "DELETE",
					params: { barId: String(openBarId) },
				}),
			).toBe(403);
		});

		it("can't remove an upcoming bar, which any participant can", async () => {
			const [upcoming] = await testDb
				.insert(sessionBars)
				.values({
					sessionId,
					name: "Upcoming",
					addedByUserId: owner.id,
					order: 2,
					status: SessionBeerStatus.waiting,
				})
				.returning();

			const params = { barId: String(upcoming.id) };

			currentUser = outsider;
			expect(await statusOf(bar, { method: "DELETE", params })).toBe(403);

			currentUser = participant;
			expect(await statusOf(bar, { method: "DELETE", params })).toBe(200);
		});

		it("can't correct a bar, even with an Untappd login", async () => {
			currentUser = { ...outsider, untappd: { accessToken: "token" } };

			expect(
				await statusOf(bar, {
					method: "PATCH",
					params: { barId: String(openBarId) },
					form: {
						bar: JSON.stringify({ name: "Venue", foursquareId: "fsq1" }),
					},
				}),
			).toBe(403);
		});

		it("can't finish or start it", async () => {
			currentUser = outsider;

			expect(await statusOf(finish)).toBe(403);
			expect(await statusOf(start)).toBe(403);
		});
	});

	describe("finishing a session", () => {
		it("isn't allowed for a participant who isn't the owner", async () => {
			currentUser = participant;

			expect(await statusOf(finish)).toBe(403);
			expect(await statusInDb()).toBe(SessionStatus.active);
		});

		it.each([
			["owner", () => owner],
			["admin", () => admin],
		])("is allowed for the %s", async (_, getUser) => {
			currentUser = getUser();

			expect(await statusOf(finish)).toBe(200);
			expect(await statusInDb()).toBe(SessionStatus.finished);
		});

		it("is allowed before the session has started", async () => {
			await setStatus(SessionStatus.created);

			expect(await statusOf(finish)).toBe(200);
			expect(await statusInDb()).toBe(SessionStatus.finished);
		});

		it("isn't possible twice", async () => {
			await setStatus(SessionStatus.finished);

			expect(await statusOf(finish)).toBe(400);
		});

		it("returns 404 for a session that doesn't exist", async () => {
			expect(await statusOf(finish, { params: { sessionId: "999999" } })).toBe(
				404,
			);
		});
	});

	describe("starting a session", () => {
		it("isn't allowed for a participant who isn't the owner", async () => {
			await setStatus(SessionStatus.created);
			currentUser = participant;

			expect(await statusOf(start)).toBe(403);
			expect(await statusInDb()).toBe(SessionStatus.created);
		});

		it("is allowed for the owner", async () => {
			await setStatus(SessionStatus.created);

			expect(await statusOf(start)).toBe(200);
			expect(await statusInDb()).toBe(SessionStatus.active);
		});

		it.each([SessionStatus.active, SessionStatus.finished])(
			"isn't possible once it's %s",
			async (status) => {
				await setStatus(status);

				expect(await statusOf(start)).toBe(400);
				expect(await statusInDb()).toBe(status);
			},
		);
	});

	describe("removing a beer", () => {
		it("isn't allowed for someone outside the session", async () => {
			await setMode(SessionMode.normal);
			currentUser = outsider;

			expect(await statusOf(remove, { params: { beerId: "1" } })).toBe(403);
		});
	});

	describe("voting", () => {
		let criterionId: number;
		let otherCriterionId: number;

		beforeEach(async () => {
			await setMode(SessionMode.normal);
			await testDb
				.update(sessionState)
				.set({ currentBeerId: beerId })
				.where(eq(sessionState.sessionId, sessionId));

			const [inSession, notInSession] = await testDb
				.insert(criteria)
				.values([
					{ name: "Smag", description: "", weight: 1 },
					{ name: "Duft", description: "", weight: 1 },
				])
				.returning();
			criterionId = inSession.id;
			otherCriterionId = notInSession.id;

			await testDb.insert(sessionCriteria).values({ sessionId, criterionId });
		});

		const voteWith = (ids: number[]) =>
			respond(vote, {
				form: {
					vote: JSON.stringify({
						sessionId,
						userId: owner.id,
						beerId,
						ratings: ids.map((id) => ({ criterionId: id, score: 5 })),
					}),
				},
			});

		const savedRatings = () => testDb.query.ratings.findMany();

		it("accepts ratings for the session's criteria", async () => {
			expect((await voteWith([criterionId])).status).toBe(200);
			expect(await savedRatings()).toHaveLength(1);
		});

		it("rejects a criterion that isn't part of the session, saving nothing", async () => {
			const { status, message } = await voteWith([
				criterionId,
				otherCriterionId,
			]);

			expect(status).toBe(400);
			expect(message).toBe("Invalid criterion in vote");
			expect(await savedRatings()).toHaveLength(0);
		});
	});

	describe("changing a bar", () => {
		const remove_ = () =>
			statusOf(bar, {
				method: "DELETE",
				params: { barId: String(openBarId) },
			});
		const correct = () =>
			statusOf(bar, {
				method: "PATCH",
				params: { barId: String(openBarId) },
				form: {
					bar: JSON.stringify({ name: "Venue", foursquareId: "fsq1" }),
				},
			});

		it("can't be removed by a participant who didn't add it", async () => {
			currentUser = participant;

			expect(await remove_()).toBe(403);
		});

		it("can be removed by the owner", async () => {
			expect(await remove_()).toBe(200);
		});

		it("can't be corrected without an Untappd login", async () => {
			currentUser = participant;

			expect(await correct()).toBe(403);
		});

		it("can be corrected by any participant with an Untappd login", async () => {
			currentUser = { ...participant, untappd: { accessToken: "token" } };

			expect(await correct()).toBe(200);
		});
	});

	describe("normal mode's routes on a One Beer session", () => {
		it("rejects adding beers", async () => {
			const { status, message } = await respond(add, {
				form: { beers: "[]" },
			});

			expect(status).toBe(400);
			expect(message).toBe(ONE_BEER_REJECTION);
		});

		it("rejects removing beers", async () => {
			const { status, message } = await respond(remove, {
				params: { beerId: "1" },
			});

			expect(status).toBe(400);
			expect(message).toBe(ONE_BEER_REJECTION);
		});

		it("rejects votes", async () => {
			const { status, message } = await respond(vote, {
				form: { vote: "{}" },
			});

			expect(status).toBe(400);
			expect(message).toBe(ONE_BEER_REJECTION);
		});

		it("lets normal sessions through to their own checks", async () => {
			await setMode(SessionMode.normal);

			const voted = await respond(vote, { form: { vote: "null" } });
			const added = await respond(add, { form: { beers: "[]" } });

			expect(voted.message).toBe("Invalid vote data");
			expect(added.message).toBe("Ingen øl valgt");
		});
	});

	describe("One Beer routes on a normal session", () => {
		it("rejects adding a bar", async () => {
			await setMode(SessionMode.normal);

			expect(await statusOf(bars, { form: newBar })).toBe(400);
		});
	});

	describe("invalid input", () => {
		it.each([
			[
				"a bar id that isn't a number",
				bar,
				{ method: "DELETE", params: { barId: "abc" } },
			],
			["a new bar without a name", bars, { form: { bar: "{}" } }],
			[
				"a bar order that isn't a list",
				bars,
				{ method: "PATCH", form: { barIds: "{}" } },
			],
			["placements with a bad id", placements, { form: { barIds: '["x"]' } }],
			["venues that aren't a list", barsSync, { form: { venues: "{}" } }],
			["a kick without a target", kick, { form: {} }],
			["a vote that isn't JSON", vote, { form: { vote: "{nope" } }],
		] as const)("rejects %s with a 400", async (_, route, options) => {
			await setMode(route === vote ? SessionMode.normal : SessionMode.oneBeer);

			expect(await statusOf(route, options)).toBe(400);
		});

		it("rejects a bar correction that isn't JSON with a 400", async () => {
			currentUser = { ...owner, untappd: { accessToken: "token" } };

			expect(
				await statusOf(bar, {
					method: "PATCH",
					params: { barId: String(openBarId) },
					form: { bar: "{nope" },
				}),
			).toBe(400);
		});

		it("rejects an unsupported method on the bar list with a 405", async () => {
			expect(await statusOf(bars, { method: "PUT", form: newBar })).toBe(405);
		});
	});
});
