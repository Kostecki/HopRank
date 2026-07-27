import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionBeerStatus } from "~/types/session";

import { createTestDb, resetTestDb, type TestDb } from "../../../test/helpers/testDb";

const testDb = createTestDb();
vi.mock("~/database/config.server", () => ({ db: testDb }));

const { addBeersToSession } = await import("./addBeersToSession.server");
const { users, sessions, sessionBeers } = await import("../schema.server");

const beerInput = (untappdBeerId: number, breweryName: string, style: string) => ({
  untappdBeerId,
  name: `Beer ${untappdBeerId}`,
  breweryName,
  abv: 5,
  style,
  label: "label.png",
});

describe("addBeersToSession", () => {
  let db: TestDb;
  let userAId: number;
  let userBId: number;
  let sessionId: number;

  beforeEach(async () => {
    db = testDb;
    resetTestDb(db);

    const [userA, userB] = await db
      .insert(users)
      .values([{ email: "a@test.com" }, { email: "b@test.com" }])
      .returning();
    userAId = userA.id;
    userBId = userB.id;

    const [session] = await db
      .insert(sessions)
      .values({ name: "Test Session", joinCode: "ABC12", createdBy: userAId })
      .returning();
    sessionId = session.id;
  });

  async function waitingOrder() {
    const rows = await db.query.sessionBeers.findMany({
      where: and(
        eq(sessionBeers.sessionId, sessionId),
        eq(sessionBeers.status, SessionBeerStatus.waiting)
      ),
      orderBy: (sb, { asc }) => asc(sb.order),
      with: { beer: true },
    });
    return rows;
  }

  it("assigns an order to a single beer added to an empty session", async () => {
    await addBeersToSession(
      sessionId,
      [beerInput(1, "Brewery A", "IPA")],
      userAId
    );

    const rows = await waitingOrder();
    expect(rows).toHaveLength(1);
    expect(rows[0].order).not.toBeNull();
  });

  it("mixes a later single-beer add in among the existing waiting queue, instead of always appending it last", async () => {
    // Three identical (same brewery/style/adder) beers already waiting.
    await addBeersToSession(
      sessionId,
      [
        beerInput(1, "Brewery A", "IPA"),
        beerInput(2, "Brewery A", "IPA"),
        beerInput(3, "Brewery A", "IPA"),
      ],
      userAId
    );

    // A later joiner adds one beer, one at a time, that differs from all
    // three in brewery/style/adder. The diversity-scoring shuffle should
    // place it adjacent to two of the identical beers (a middle slot)
    // rather than always at the very end, since a middle slot strictly
    // maximizes the "differs from neighbor" score for this beer set.
    await addBeersToSession(
      sessionId,
      [beerInput(4, "Brewery B", "Stout")],
      userBId
    );

    const rows = await waitingOrder();
    expect(rows).toHaveLength(4);

    const newBeerIndex = rows.findIndex((r) => r.beer.untappdBeerId === 4);
    // Under the old bug, this was always the fixed last index (3) with no
    // shuffle involved at all. Assert it isn't stuck there.
    expect(newBeerIndex).not.toBe(3);
  });
});
