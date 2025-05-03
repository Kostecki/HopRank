import { data } from "react-router";
import { eq, inArray } from "drizzle-orm";

import { db } from "~/database/config.server";
import {
  ratings,
  sessionBeers,
  sessionCriteria,
  sessions,
  sessionState,
  sessionUsers,
  users,
} from "~/database/schema.server";
import { userSessionGet } from "~/auth/users.server";

import { extractSessionId } from "~/utils/utils";

import type { Route } from "./+types/progress";
import { SessionBeerStatus } from "~/types/session";

export async function loader({ request, params }: Route.LoaderArgs) {
  const sessionId = extractSessionId(params.sessionId);
  const user = await userSessionGet(request);

  const [
    state,
    sessionUsersRow,
    sessionCriteriaRows,
    sessionBeerRows,
    allRatings,
    session,
  ] = await Promise.all([
    db.query.sessionState.findFirst({
      where: eq(sessionState.sessionId, sessionId),
    }),
    db.query.sessionUsers.findMany({
      where: eq(sessionUsers.sessionId, sessionId),
    }),
    db.query.sessionCriteria.findMany({
      where: eq(sessionCriteria.sessionId, sessionId),
      with: { criterion: true },
    }),
    db.query.sessionBeers.findMany({
      where: eq(sessionBeers.sessionId, sessionId),
      with: { beer: true },
    }),
    db.query.ratings.findMany({
      where: eq(ratings.sessionId, sessionId),
    }),
    db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    }),
  ]);

  /*
    Manual join sessionUsers and users to get user details.
    Drizzle doesn't want to ¯\_(ツ)_/¯
  */
  const sessionUserRows = await db.query.sessionUsers.findMany({
    where: eq(sessionUsers.sessionId, sessionId),
  });
  const userIds = sessionUserRows.map((su) => su.userId);
  const usersForSession = await db.query.users.findMany({
    where: inArray(
      users.id,
      userIds.filter((id): id is number => id !== null)
    ),
  });

  if (!session) {
    return data({ message: "Session not found" }, { status: 404 });
  }

  const sessionBeerRowsNotEmpty = sessionBeerRows.filter(
    (sb): sb is typeof sb & { beer: NonNullable<typeof sb.beer> } =>
      sb.beer !== null
  );

  const criteriaList = sessionCriteriaRows
    .filter(
      (
        row
      ): row is typeof row & { criterion: NonNullable<typeof row.criterion> } =>
        row.criterion !== null
    )
    .map((row) => ({
      id: row.criterion.id,
      name: row.criterion.name,
      weight: row.criterion.weight,
    }));

  const currentBeerRow = sessionBeerRowsNotEmpty.find(
    (sb) =>
      sb.beer.id === state?.currentBeerId &&
      sb.status !== SessionBeerStatus.rated
  );

  const expectedVotes = sessionUsersRow.length;
  const currentBeerVotes = allRatings.filter(
    (r) => r.beerId === state?.currentBeerId
  );
  const uniqueUserVotes = new Set(currentBeerVotes.map((r) => r.userId)).size;

  let userRatingsById: Record<number, number> = {};
  if (user && state?.currentBeerId) {
    const userRatings = allRatings.filter(
      (r) => r.userId === user.id && r.beerId === state.currentBeerId
    );

    userRatingsById = Object.fromEntries(
      userRatings.map((r) => [r.criterionId, r.score])
    );
  }

  const ratedBeers = sessionBeerRowsNotEmpty
    .filter(
      (sb) =>
        sb.status === SessionBeerStatus.rated &&
        sb.beer.id !== state?.currentBeerId
    )
    .map(({ beer, order, addedByUserId }) => {
      let totalWeighted = 0;
      let totalWeight = 0;

      const criteriaBreakdown = criteriaList.map((criterion) => {
        const scores = allRatings.filter(
          (rating) =>
            rating.beerId === beer.id && rating.criterionId === criterion.id
        );
        const avg =
          scores.reduce((sum, rating) => sum + rating.score, 0) /
          (sessionUsersRow.length || 1);

        totalWeighted += avg * criterion.weight;
        totalWeight += criterion.weight;

        return {
          criterionId: criterion.id,
          name: criterion.name,
          weight: criterion.weight,
          averageScore: avg,
        };
      });

      const averageScore = totalWeight > 0 ? totalWeighted / totalWeight : 0;

      return {
        beerId: beer.id,
        untappdBeerId: beer.untappdBeerId,
        name: beer.name,
        breweryName: beer.breweryName,
        style: beer.style,
        label: beer.label,
        order,
        averageScore,
        criteriaBreakdown,
        addedByUserId,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore);

  return data({
    sessionId,
    sessionName: session?.name,
    status: state?.status,
    beersTotalCount: sessionBeerRowsNotEmpty.length,
    beersRatedCount: ratedBeers.length,
    users: usersForSession,
    sessionCriteria: criteriaList,
    currentBeer: currentBeerRow?.beer
      ? {
          beerId: currentBeerRow.beer.id,
          untappdBeerId: currentBeerRow.beer.untappdBeerId,
          name: currentBeerRow.beer.name,
          breweryName: currentBeerRow.beer.breweryName,
          style: currentBeerRow.beer.style,
          label: currentBeerRow.beer.label,
          order: state?.currentBeerOrder ?? 0,
          currentVoteCount: uniqueUserVotes,
          totalPossibleVoteCount: expectedVotes,
          userRatings: userRatingsById,
        }
      : null,
    ratedBeers,
  });
}
