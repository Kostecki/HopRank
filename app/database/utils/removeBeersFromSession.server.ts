import { and, eq, inArray } from "drizzle-orm";

import { SessionBeerStatus } from "~/types/session";

import { shuffleBeersInSession } from "~/utils/shuffle";

import { db } from "../config.server";
import { sessionBeers } from "../schema.server";

export const removeBeersFromSession = async (
  sessionId: number,
  beerInputs: number[],
  userId: number
) => {
  if (beerInputs.length === 0) {
    return;
  }

  // Only "waiting" beers are removable, matching the UI's own disabled-button
  // rule (Navbar.tsx). The previous ne(status, rated) check also allowed
  // deleting the current "rating" beer, which left sessionState.currentBeerId
  // pointing at a now-nonexistent row -- current beer would show as null with
  // no way to vote or recover, permanently stalling the session.
  const beersToDelete = await db.query.sessionBeers.findMany({
    where: and(
      eq(sessionBeers.sessionId, sessionId),
      inArray(sessionBeers.beerId, beerInputs),
      eq(sessionBeers.addedByUserId, userId),
      eq(sessionBeers.status, SessionBeerStatus.waiting)
    ),
  });

  const idsToDelete = beersToDelete.map((beer) => beer.id);

  if (idsToDelete.length > 0) {
    await db.delete(sessionBeers).where(inArray(sessionBeers.id, idsToDelete));
    await shuffleBeersInSession(sessionId);
  }
};
