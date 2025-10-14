import { and, eq, inArray } from "drizzle-orm";
import { data } from "react-router";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import {
  ratings,
  sessionBeers,
  sessionCriteria,
  sessionState,
  sessionUsers,
  sessions,
  users,
} from "~/database/schema.server";

import { getBeerInfo } from "~/utils/untappd";
import { extractSessionId } from "~/utils/utils";

import { SessionBeerStatus, SessionStatus } from "~/types/session";
import type { Route } from "./+types/progress";

const beerInfoCache = new Map<
  number,
  Awaited<ReturnType<typeof getBeerInfo>>
>();

export async function getCachedBeerInfo(beerId: number, accessToken: string) {
  if (beerInfoCache.has(beerId)) {
    return beerInfoCache.get(beerId);
  }

  const data = await getBeerInfo(beerId, accessToken);
  beerInfoCache.set(beerId, data);
  return data;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const sessionId = extractSessionId(params.sessionId);
  const user = await userSessionGet(request);

  const [
    state,
    activeSessionUsers,
    sessionCriteriaRows,
    sessionBeerRows,
    allRatings,
    session,
  ] = await Promise.all([
    db.query.sessionState.findFirst({
      where: eq(sessionState.sessionId, sessionId),
    }),
    db.query.sessionUsers.findMany({
      where: and(
        eq(sessionUsers.sessionId, sessionId),
        eq(sessionUsers.active, true)
      ),
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

  if (!session) {
    return data({ message: "Session not found" }, { status: 404 });
  }

  const userIds = activeSessionUsers.map((su) => su.userId);
  const usersForSession = await db.query.users.findMany({
    where: inArray(
      users.id,
      userIds.filter((id): id is number => id !== null)
    ),
  });

  // Count session users from ratings for finished sessions
  // Shows who participated in the session
  // Get ratings, extract unique userIds, fetch those users
  const ratingsForSession = await db.query.ratings.findMany({
    where: eq(ratings.sessionId, sessionId),
    columns: {
      userId: true,
    },
  });
  const uniqueUserIds = Array.from(
    new Set(
      ratingsForSession
        .map((r) => r.userId)
        .filter((id): id is number => id != null)
    )
  ) as readonly number[];
  const userCountByVotes = await db.query.users.findMany({
    where: inArray(users.id, uniqueUserIds),
  });

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

  const expectedVotes = activeSessionUsers.length;
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
          (scores.length || 1);

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

      const uniqueVoters = new Set(
        allRatings.filter((r) => r.beerId === beer.id).map((r) => r.userId)
      ).size;

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
        votesCount: uniqueVoters,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore);

  const currentBeerData = currentBeerRow?.beer
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
        userRatings: user ? userRatingsById : undefined,
        userHadBeer: false,
        addedByUserId: currentBeerRow.addedByUserId,
      }
    : null;

  // Check if the current beer has already been checked in by the user
  let userHadBeer = undefined;
  if (currentBeerData && user?.untappd) {
    const beerInfo = await getCachedBeerInfo(
      currentBeerData.untappdBeerId,
      user.untappd.accessToken
    );

    userHadBeer = beerInfo?.stats.user_count > 0 || false;
  }

  return data({
    sessionId,
    sessionName: session.name,
    status: state?.status,
    joinCode: session.joinCode,
    beersTotalCount: sessionBeerRowsNotEmpty.length,
    beersRatedCount: ratedBeers.length,
    users:
      state?.status === SessionStatus.active
        ? usersForSession
        : userCountByVotes,
    sessionCriteria: criteriaList,
    currentBeer: { ...currentBeerData, userHadBeer },
    ratedBeers,
  });
}
