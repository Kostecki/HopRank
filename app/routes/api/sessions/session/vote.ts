import { data } from "react-router";
import { eq } from "drizzle-orm";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { ratings, sessionState } from "~/database/schema.server";

import { extractSessionId } from "~/utils/utils";
import { tryAdvanceSession } from "~/database/utils/tryAdvanceSession.server";
import { bumpLastUpdatedAt } from "~/database/utils/bumpLastUpdatedAt.server";

import type { Route } from "./+types/vote";
import { SessionStatus } from "~/types/session";
import type { Vote } from "~/types/rating";

export async function action({ request, params }: Route.ActionArgs) {
  const sessionId = extractSessionId(params.sessionId);
  const user = await userSessionGet(request);

  if (!user) {
    return data({ message: "User not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const voteJson = formData.get("vote");
  const vote = JSON.parse(String(voteJson)) as Vote;

  if (!vote) {
    return data({ message: "Invalid vote data" }, { status: 400 });
  }

  if (vote.sessionId !== sessionId) {
    return data({ message: "Session ID does not match vote" }, { status: 400 });
  }

  const state = await db.query.sessionState.findFirst({
    where: eq(sessionState.sessionId, sessionId),
  });

  if (!state || state.status !== SessionStatus.active) {
    return data({ message: "Session is not in voting mode" }, { status: 400 });
  }

  if (state.currentBeerId !== vote.beerId) {
    return data(
      { message: "Beer ID does not match current beer" },
      { status: 400 }
    );
  }

  for (const rating of vote.ratings) {
    const { sessionId, beerId, userId } = vote;
    const { id: criterionId, rating: score } = rating;

    try {
      await db
        .insert(ratings)
        .values({
          sessionId,
          beerId,
          userId,
          criterionId: criterionId,
          score: score,
        })
        .onConflictDoUpdate({
          target: [
            ratings.sessionId,
            ratings.beerId,
            ratings.userId,
            ratings.criterionId,
          ],
          set: {
            score: score,
          },
        });
    } catch (error) {
      console.error("Error inserting/updating rating:", error);
      return data(
        { message: "Error inserting/updating rating" },
        { status: 500 }
      );
    }
  }

  await bumpLastUpdatedAt(sessionId);
  await tryAdvanceSession(sessionId);

  return data({ success: true });
}
