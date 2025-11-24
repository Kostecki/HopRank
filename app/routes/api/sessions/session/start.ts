import { and, eq } from "drizzle-orm";
import { data } from "react-router";

import { SessionBeerStatus, SessionStatus } from "~/types/session";
import type { Route } from "./+types/start";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { sessionBeers, sessionState } from "~/database/schema.server";
import { shuffleBeersInSession } from "~/utils/shuffle";
import { extractSessionId } from "~/utils/utils";
import { emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
  const sessionId = extractSessionId(params.sessionId);
  const user = await userSessionGet(request);

  if (!user) {
    return data({ message: "User not authenticated" }, { status: 401 });
  }

  try {
    // Shuffle beers in session
    await shuffleBeersInSession(sessionId);

    // Set session status to active
    await db
      .update(sessionState)
      .set({ status: SessionStatus.active })
      .where(eq(sessionState.sessionId, sessionId));

    // If there is a current beer, emit started event and return
    const state = await db.query.sessionState.findFirst({
      where: eq(sessionState.sessionId, sessionId),
      columns: { currentBeerId: true },
    });
    if (state?.currentBeerId) {
      emitSessionEvent(sessionId, "session:started");
      return data({ success: true });
    }

    // Set the first waiting beer as the current beer
    const first = await db.query.sessionBeers.findFirst({
      where: and(
        eq(sessionBeers.sessionId, sessionId),
        eq(sessionBeers.status, SessionBeerStatus.waiting)
      ),
      orderBy: (sb, { asc }) => asc(sb.order),
    });
    if (!first) {
      return data({ success: false });
    }

    // Update session state with the first beer
    await db
      .update(sessionState)
      .set({
        currentBeerId: first.beerId,
        currentBeerOrder: first.order,
      })
      .where(eq(sessionState.sessionId, sessionId));

    // Update the first beer status to "rating"
    await db
      .update(sessionBeers)
      .set({ status: SessionBeerStatus.rating })
      .where(eq(sessionBeers.id, first.id));

    emitSessionEvent(sessionId, "session:started");

    return data({ success: true });
  } catch (error) {
    console.error("Error starting session:", error);
    return data({ message: "Fejl ved start af session" }, { status: 500 });
  }
}
