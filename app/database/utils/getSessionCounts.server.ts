import { and, count, eq } from "drizzle-orm";
import { db } from "../config.server";
import { sessionBeers, sessionState, sessionUsers } from "../schema.server";

export const getSessionCounts = async (sessionId: number) => {
  try {
    const [state, participantCount, beerCount] = await Promise.all([
      db.query.sessionState.findFirst({
        where: eq(sessionState.sessionId, sessionId),
      }),
      db
        .select({ count: count() })
        .from(sessionUsers)
        .where(
          and(
            eq(sessionUsers.sessionId, sessionId),
            eq(sessionUsers.active, true)
          )
        ),
      db
        .select({ count: count() })
        .from(sessionBeers)
        .where(eq(sessionBeers.sessionId, sessionId)),
    ]);

    return {
      state,
      participantCount: participantCount[0].count ?? 0,
      beerCount: beerCount[0].count ?? 0,
    };
  } catch (error) {
    console.error(
      "Error getting session counts for sessionId",
      sessionId,
      error
    );

    return {
      state: null,
      participantCount: 0,
      beerCount: 0,
    };
  }
};
