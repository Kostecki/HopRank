import { and, eq } from "drizzle-orm";
import { db } from "../config.server";
import {
  ratings,
  sessionBeers,
  sessionCriteria,
  sessionState,
  sessionUsers,
} from "../schema.server";

import { SessionBeerStatus, SessionStatus } from "~/types/session";

export const tryAdvanceSession = async (sessionId: number) => {
  const state = await db.query.sessionState.findFirst({
    where: eq(sessionState.sessionId, sessionId),
  });

  if (!state || state.status !== SessionStatus.active) {
    return;
  }

  const [users, criteriaList, submittedRatings] = await Promise.all([
    db.query.sessionUsers.findMany({
      where: and(
        eq(sessionUsers.sessionId, sessionId),
        eq(sessionUsers.active, true)
      ),
    }),
    db.query.sessionCriteria.findMany({
      where: eq(sessionCriteria.sessionId, sessionId),
    }),
    db.query.ratings.findMany({
      where: and(
        eq(ratings.sessionId, sessionId),
        eq(ratings.beerId, state.currentBeerId!)
      ),
    }),
  ]);

  const expectedVotes = users.length * criteriaList.length;
  const submittedVotes = submittedRatings.length;

  if (submittedVotes >= expectedVotes) {
    const allBeers = await db.query.sessionBeers.findMany({
      where: eq(sessionBeers.sessionId, sessionId),
      orderBy: (sb, { asc }) => asc(sb.order),
    });

    // Do nothing if all beers are already rated
    if (allBeers.every((b) => b.status === "rated")) {
      return;
    }

    const currentIndex = allBeers.findIndex(
      (b) => b.beerId === state.currentBeerId
    );
    const currentBeer = allBeers[currentIndex];
    const nextBeer = allBeers
      .slice(currentIndex + 1)
      .find((b) => b.status === SessionBeerStatus.waiting);

    if (currentBeer) {
      await db
        .update(sessionBeers)
        .set({ status: "rated" })
        .where(eq(sessionBeers.id, currentBeer.id));
    }

    if (nextBeer) {
      await db
        .update(sessionBeers)
        .set({ status: "rating" })
        .where(eq(sessionBeers.id, nextBeer.id));
    }

    await db
      .insert(sessionState)
      .values({
        sessionId,
        currentBeerId: nextBeer?.beerId ?? null,
        currentBeerOrder: nextBeer?.order ?? null,
      })
      .onConflictDoUpdate({
        target: sessionState.sessionId,
        set: {
          currentBeerId: nextBeer?.beerId ?? null,
          currentBeerOrder: nextBeer?.order ?? null,
        },
      });
  }
};
