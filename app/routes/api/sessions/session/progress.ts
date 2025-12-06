import { and, eq, inArray } from "drizzle-orm";
import { data } from "react-router";

import type { SessionProgressUser } from "~/types/session";
import { SessionBeerStatus } from "~/types/session";
import type { Route } from "./+types/progress";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import {
  beers,
  ratings,
  sessionBeers,
  sessionCriteria,
  sessionState,
  sessions,
  sessionUsers,
  users,
} from "~/database/schema.server";
import type { SelectUsers } from "~/database/schema.types";
import { getBeerInfo } from "~/utils/untappd";
import { extractSessionId } from "~/utils/utils";

const beerInfoCache = new Map<
  number,
  Awaited<ReturnType<typeof getBeerInfo>>
>();

const toSessionProgressUser = (user: SelectUsers): SessionProgressUser => ({
  id: user.id,
  email: user.email,
  admin: user.admin,
  name: user.name,
  untappdId: user.untappdId,
  username: user.username,
  avatarURL: user.avatarURL,
  createdAt: user.createdAt,
  lastUpdatedAt: user.lastUpdatedAt,
});

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
    db
      .select({
        sessionBeer: sessionBeers,
        beer: beers,
      })
      .from(sessionBeers)
      .innerJoin(beers, eq(sessionBeers.beerId, beers.id))
      .where(eq(sessionBeers.sessionId, sessionId)),
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
  const activeIds = userIds.filter((id): id is number => id !== null);

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

  const sessionBeerRowsWithBeer = sessionBeerRows.map(
    ({ sessionBeer, beer }) => ({
      ...sessionBeer,
      beer,
    })
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

  // Compute overall average score per criterion across rated beers (excluding current beer)
  const ratedBeerIds = new Set(
    sessionBeerRowsWithBeer
      .filter((sessionBeer) => sessionBeer.status === SessionBeerStatus.rated)
      .map((sessionBeer) => sessionBeer.beer.id)
  );
  const scoredCriteria = criteriaList.map((criterion) => {
    const criterionRatings = allRatings.filter(
      (r) => r.criterionId === criterion.id && ratedBeerIds.has(r.beerId ?? -1)
    );
    const avg =
      criterionRatings.reduce((sum, r) => sum + r.score, 0) /
      (criterionRatings.length || 1);
    return {
      criterionId: criterion.id,
      name: criterion.name,
      weight: criterion.weight,
      averageScore: avg,
    };
  });

  const currentBeerRow = sessionBeerRowsWithBeer.find(
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

  // Build unified user list including adders to ensure podium avatar resolution
  const beerAdderIds = new Set<number>(
    sessionBeerRowsWithBeer
      .map((sb) => sb.addedByUserId)
      .filter((id): id is number => typeof id === "number")
  );
  const unionUserIds = new Set<number>([
    ...beerAdderIds,
    ...activeIds,
    ...uniqueUserIds,
  ]);
  const allRelevantUsersRaw = await db.query.users.findMany({
    where: inArray(users.id, [...unionUserIds]),
  });
  const allRelevantUsers = allRelevantUsersRaw.map(toSessionProgressUser);

  const ratedBeers = sessionBeerRowsWithBeer
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
      const votesCount = new Set(
        allRatings.filter((r) => r.beerId === beer.id).map((r) => r.userId)
      ).size;

      return {
        beerId: beer.id,
        untappdBeerId: beer.untappdBeerId,
        name: beer.name,
        breweryName: beer.breweryName,
        abv: beer.abv,
        style: beer.style,
        label: beer.label,
        label_hd: beer.label_hd,
        order,
        averageScore,
        criteriaBreakdown,
        addedByUserId,
        votesCount,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore);

  const currentBeerData = currentBeerRow?.beer
    ? (() => {
        const currentBeerRatings = allRatings.filter(
          (r) => r.beerId === currentBeerRow.beer.id
        );
        let totalWeightedCurrent = 0;
        let totalWeightCurrent = 0;
        const criteriaBreakdown = criteriaList.map((criterion) => {
          const scores = currentBeerRatings.filter(
            (rating) => rating.criterionId === criterion.id
          );
          const avg =
            scores.reduce((sum, rating) => sum + rating.score, 0) /
            (scores.length || 1);
          totalWeightedCurrent += avg * criterion.weight;
          totalWeightCurrent += criterion.weight;
          return {
            criterionId: criterion.id,
            name: criterion.name,
            weight: criterion.weight,
            averageScore: avg,
          };
        });
        const averageScore =
          totalWeightCurrent > 0
            ? totalWeightedCurrent / totalWeightCurrent
            : 0;
        return {
          beerId: currentBeerRow.beer.id,
          untappdBeerId: currentBeerRow.beer.untappdBeerId,
          name: currentBeerRow.beer.name,
          breweryName: currentBeerRow.beer.breweryName,
          abv: currentBeerRow.beer.abv,
          style: currentBeerRow.beer.style,
          label: currentBeerRow.beer.label,
          label_hd: currentBeerRow.beer.label_hd,
          order: state?.currentBeerOrder ?? 0,
          currentVoteCount: uniqueUserVotes,
          totalPossibleVoteCount: expectedVotes,
          userRatings: user ? userRatingsById : {},
          userHadBeer: false,
          addedByUserId: currentBeerRow.addedByUserId,
          averageScore,
          criteriaBreakdown,
          votesCount: uniqueUserVotes,
        };
      })()
    : null;

  // Check if the current beer has already been checked in by the user
  let userHadBeer = false;
  if (currentBeerData && user?.untappd) {
    const beerInfo = await getCachedBeerInfo(
      currentBeerData.untappdBeerId,
      user.untappd.accessToken
    );

    userHadBeer = beerInfo?.stats?.user_count > 0;
  }

  return data({
    sessionId,
    sessionName: session.name,
    status: state?.status,
    createdAt: session.createdAt,
    createdBy: session.createdBy,
    joinCode: session.joinCode,
    beersTotalCount: sessionBeerRowsWithBeer.length,
    beersRatedCount: ratedBeers.length,
    users: allRelevantUsers,
    scoredCriteria,
    currentBeer: { ...currentBeerData, userHadBeer },
    ratedBeers,
  });
}
