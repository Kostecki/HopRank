import { and, eq, inArray } from "drizzle-orm";

import { SessionBeerStatus, SessionStatus } from "~/types/session";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import {
  ratings,
  sessionBeers,
  sessionCriteria,
  sessionState,
  sessions,
  sessionUsers,
  users,
} from "~/database/schema.server";
import { getBeerInfo } from "~/utils/untappd";

const beerInfoCache = new Map<
  number,
  Awaited<ReturnType<typeof getBeerInfo>>
>();

async function getCachedBeerInfo(beerId: number, accessToken: string) {
  const cachedInfo = beerInfoCache.get(beerId);
  if (cachedInfo) return cachedInfo;
  const info = await getBeerInfo(beerId, accessToken);
  beerInfoCache.set(beerId, info);
  return info;
}

export async function getSessionProgress({
  request,
  sessionId,
}: {
  request: Request;
  sessionId: number;
}) {
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
    db.query.ratings.findMany({ where: eq(ratings.sessionId, sessionId) }),
    db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) }),
  ]);

  if (!session) {
    return { statusCode: 404, error: "Session not found" } as const;
  }

  const userIds = activeSessionUsers
    .map((su) => su.userId)
    .filter((id): id is number => id !== null);
  const usersForSession = await db.query.users.findMany({
    where: inArray(users.id, userIds),
  });

  const ratingsForSession = await db.query.ratings.findMany({
    where: eq(ratings.sessionId, sessionId),
    columns: { userId: true },
  });
  const uniqueUserIds = Array.from(
    new Set(
      ratingsForSession
        .map((r) => r.userId)
        .filter((id): id is number => id != null)
    )
  );
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
      description: row.criterion.description,
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

  let userHadBeer = false;
  if (currentBeerData && user?.untappd) {
    const beerInfo = await getCachedBeerInfo(
      currentBeerData.untappdBeerId,
      user.untappd.accessToken
    );
    userHadBeer = beerInfo?.stats?.user_count > 0;
  }

  const inProgressSession =
    state?.status === SessionStatus.active ||
    state?.status === SessionStatus.created;

  return {
    sessionId,
    sessionName: session.name,
    status: state?.status,
    createdAt: session.createdAt,
    createdBy: session.createdBy,
    joinCode: session.joinCode,
    beersTotalCount: sessionBeerRowsNotEmpty.length,
    beersRatedCount: ratedBeers.length,
    users: inProgressSession ? usersForSession : userCountByVotes,
    sessionCriteria: criteriaList,
    currentBeer: currentBeerData ? { ...currentBeerData, userHadBeer } : null,
    ratedBeers,
  };
}
