import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionBeerStatus } from "~/types/session";

import { createTestDb, resetTestDb, type TestDb } from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const { removeBeersFromSession } = await import("./removeBeersFromSession.server");
const { users, sessions, sessionBeers, beers, sessionState } = await import(
  "../schema.server"
);

describe("removeBeersFromSession", () => {
  let db: TestDb;
  let userId: number;
  let sessionId: number;

  async function seedBeer(
    untappdBeerId: number,
    status: (typeof SessionBeerStatus)[keyof typeof SessionBeerStatus]
  ) {
    const [beer] = await db
      .insert(beers)
      .values({
        untappdBeerId,
        name: `Beer ${untappdBeerId}`,
        breweryName: "Brewery",
        style: "IPA",
        label: "label.png",
      })
      .returning();

    const [sessionBeer] = await db
      .insert(sessionBeers)
      .values({
        sessionId,
        beerId: beer.id,
        addedByUserId: userId,
        order: untappdBeerId,
        status,
      })
      .returning();

    return { beer, sessionBeer };
  }

  beforeEach(async () => {
    db = testDb;
    resetTestDb(db);

    const [user] = await db
      .insert(users)
      .values({ email: "a@test.com" })
      .returning();
    userId = user.id;

    const [session] = await db
      .insert(sessions)
      .values({ name: "Test Session", joinCode: "ABC12", createdBy: userId })
      .returning();
    sessionId = session.id;
  });

  it("removes a waiting beer", async () => {
    const { sessionBeer } = await seedBeer(1, SessionBeerStatus.waiting);

    await removeBeersFromSession(sessionId, [sessionBeer.beerId], userId);

    const remaining = await db.query.sessionBeers.findFirst({
      where: eq(sessionBeers.id, sessionBeer.id),
    });
    expect(remaining).toBeUndefined();
  });

  it("does not remove the currently-active (rating) beer", async () => {
    const { sessionBeer, beer } = await seedBeer(1, SessionBeerStatus.rating);
    await db.insert(sessionState).values({
      sessionId,
      currentBeerId: beer.id,
      currentBeerOrder: sessionBeer.order,
    });

    await removeBeersFromSession(sessionId, [sessionBeer.beerId], userId);

    const remaining = await db.query.sessionBeers.findFirst({
      where: eq(sessionBeers.id, sessionBeer.id),
    });
    // Still present, and still exactly what sessionState.currentBeerId
    // points at -- this is the regression check: under the old bug, this
    // row would have been deleted, orphaning sessionState.currentBeerId.
    expect(remaining).toBeDefined();
    expect(remaining?.status).toBe(SessionBeerStatus.rating);

    const state = await db.query.sessionState.findFirst({
      where: eq(sessionState.sessionId, sessionId),
    });
    expect(state?.currentBeerId).toBe(beer.id);
  });

  it("does not remove an already-rated beer", async () => {
    const { sessionBeer } = await seedBeer(1, SessionBeerStatus.rated);

    await removeBeersFromSession(sessionId, [sessionBeer.beerId], userId);

    const remaining = await db.query.sessionBeers.findFirst({
      where: eq(sessionBeers.id, sessionBeer.id),
    });
    expect(remaining).toBeDefined();
  });
});
