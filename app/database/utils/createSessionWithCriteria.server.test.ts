import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionMode } from "~/types/session";

import {
	createTestDb,
	resetTestDb,
	type TestDb,
} from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const { createSessionWithCriteria } = await import(
	"./createSessionWithCriteria.server"
);
const { users, sessions, beers, criteria, sessionCriteria, sessionState } =
	await import("../schema.server");

describe("createSessionWithCriteria", () => {
	let db: TestDb;
	let userId: number;
	let criterionId: number;

	beforeEach(async () => {
		db = testDb;
		resetTestDb(db);

		const [user] = await db
			.insert(users)
			.values({ email: "creator@test.com" })
			.returning();
		userId = user.id;

		const [criterion] = await db
			.insert(criteria)
			.values({ name: "Rating", description: "desc", weight: 1 })
			.returning();
		criterionId = criterion.id;
	});

	it("creates the session, its criteria links, and its state atomically", () => {
		const session = createSessionWithCriteria({
			name: "Test Session",
			createdBy: userId,
			joinCode: "ABC12",
			criterionIds: [criterionId],
		});

		expect(session.name).toBe("Test Session");

		const criteriaRows = db
			.select()
			.from(sessionCriteria)
			.where(eq(sessionCriteria.sessionId, session.id))
			.all();
		expect(criteriaRows).toHaveLength(1);

		const stateRow = db
			.select()
			.from(sessionState)
			.where(eq(sessionState.sessionId, session.id))
			.get();
		expect(stateRow).toBeDefined();
	});

	it("creates normal sessions by default, with no beer", () => {
		const session = createSessionWithCriteria({
			name: "Test Session",
			createdBy: userId,
			joinCode: "ABC12",
			criterionIds: [criterionId],
		});

		expect(session.mode).toBe(SessionMode.normal);
		expect(session.beerId).toBeNull();
	});

	it("creates a One Beer session with its beer and no criteria", () => {
		const [beer] = db
			.insert(beers)
			.values({
				untappdBeerId: 1,
				name: "Stout",
				breweryName: "Brewery",
				style: "Stout",
				label: "label.png",
			})
			.returning()
			.all();

		const session = createSessionWithCriteria({
			name: "Crawl",
			createdBy: userId,
			joinCode: "ABC12",
			criterionIds: [],
			mode: SessionMode.oneBeer,
			beerId: beer.id,
		});

		expect(session.mode).toBe(SessionMode.oneBeer);
		expect(session.beerId).toBe(beer.id);
		expect(
			db
				.select()
				.from(sessionCriteria)
				.where(eq(sessionCriteria.sessionId, session.id))
				.all(),
		).toHaveLength(0);
		expect(
			db
				.select()
				.from(sessionState)
				.where(eq(sessionState.sessionId, session.id))
				.get(),
		).toBeDefined();
	});

	it("rolls back the session row if the criteria insert fails", () => {
		// A non-existent criterionId violates the FK constraint on
		// session_criteria.criterion_id, failing partway through the
		// transaction after the session row has already been inserted.
		const nonExistentCriterionId = criterionId + 999;

		expect(() =>
			createSessionWithCriteria({
				name: "Should Not Persist",
				createdBy: userId,
				joinCode: "ZZZ99",
				criterionIds: [nonExistentCriterionId],
			}),
		).toThrow();

		const persisted = db
			.select()
			.from(sessions)
			.where(eq(sessions.name, "Should Not Persist"))
			.all();
		expect(persisted).toHaveLength(0);
	});
});
