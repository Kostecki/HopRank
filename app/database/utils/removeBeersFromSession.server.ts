import { and, eq, inArray, ne } from "drizzle-orm";

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

  const beersToDelete = await db.query.sessionBeers.findMany({
    where: and(
      eq(sessionBeers.sessionId, sessionId),
      inArray(sessionBeers.beerId, beerInputs),
      eq(sessionBeers.addedByUserId, userId),
      ne(sessionBeers.status, SessionBeerStatus.rated)
    ),
  });

  const idsToDelete = beersToDelete.map((beer) => beer.id);

  if (idsToDelete.length > 0) {
    await db.delete(sessionBeers).where(inArray(sessionBeers.id, idsToDelete));
    await shuffleBeersInSession(sessionId);
  }
};
