import { eq } from "drizzle-orm";

import type { SessionStats } from "~/types/session";

import { invariant } from "~/utils/invariant";

import { db } from "../config.server";
import {
  beers,
  ratings,
  sessionBeers,
  sessions,
  users,
} from "../schema.server";

// Highest Rater: People with the exact same highest average scores across all beers in the session
// Lowest Rater: People with the exact same lowest average scores across all beers in the session
// Average ABV: The average ABV of all beers in the session
// Average Rating: The average rating given across all beers in the session
// Most Popular Style: The beer style that appears most frequently in the session
// Number of different styles: Count of unique beer styles in the session

const AVERAGE_DECIMALS = 2;

function roundScore(value: number) {
  return Number(value.toFixed(AVERAGE_DECIMALS));
}

function sortRaters(raters: SessionStats["highestRaters"]) {
  return [...raters].sort((a, b) => {
    const nameA = a.name ?? "";
    const nameB = b.name ?? "";
    const nameComparison = nameA.localeCompare(nameB, "en", {
      sensitivity: "base",
    });
    if (nameComparison !== 0) {
      return nameComparison;
    }
    return a.userId - b.userId;
  });
}

export async function getSessionStats(
  sessionId: number
): Promise<SessionStats> {
  // Fetch session record, beers in session, and ratings in session
  const [sessionRecord, sessionBeerRows, ratingRows] = await Promise.all([
    db.query.sessions.findFirst({
      columns: { id: true },
      where: eq(sessions.id, sessionId),
    }),
    db
      .select({
        abv: beers.abv,
        style: beers.style,
      })
      .from(sessionBeers)
      .innerJoin(beers, eq(sessionBeers.beerId, beers.id))
      .where(eq(sessionBeers.sessionId, sessionId)),
    db
      .select({
        userId: ratings.userId,
        score: ratings.score,
        name: users.name,
        username: users.username,
      })
      .from(ratings)
      .innerJoin(users, eq(users.id, ratings.userId))
      .where(eq(ratings.sessionId, sessionId)),
  ]);

  invariant(sessionRecord, `Session ${sessionId} not found`);

  // Calculate average ABV of beers in session
  const averageABV =
    sessionBeerRows.reduce((sum, row) => sum + row.abv, 0) /
    sessionBeerRows.length;

  // Calculate average rating in session
  const averageRating = ratingRows.length
    ? ratingRows.reduce((sum, row) => sum + row.score, 0) / ratingRows.length
    : 0;

  // Calculate unique style count for beers in session
  const styleCounts = new Map<string, number>();
  for (const row of sessionBeerRows) {
    styleCounts.set(row.style, (styleCounts.get(row.style) ?? 0) + 1);
  }

  // Count most popular style in session
  let mostPopularStyle: SessionStats["styleStats"]["mostPopular"] = null;
  for (const [style, count] of styleCounts) {
    if (!mostPopularStyle || count > mostPopularStyle.count) {
      mostPopularStyle = { style, count };
    } else if (
      mostPopularStyle &&
      count === mostPopularStyle.count &&
      style.localeCompare(mostPopularStyle.style, "en", {
        sensitivity: "base",
      }) < 0
    ) {
      mostPopularStyle = { style, count };
    }
  }

  // Aggregate ratings by user to calculate average ratings
  const userAggregates = new Map<
    number,
    { total: number; count: number; name: string | null }
  >();

  for (const row of ratingRows) {
    const displayName = row.name ?? row.username ?? null;
    const agg = userAggregates.get(row.userId) ?? {
      total: 0,
      count: 0,
      name: displayName,
    };
    agg.total += row.score;
    agg.count += 1;
    if (agg.name == null && displayName != null) {
      agg.name = displayName;
    }
    userAggregates.set(row.userId, agg);
  }

  // Calculate average ratings per user
  const roundedUserAverages = Array.from(userAggregates, ([userId, value]) => ({
    userId,
    avgScore: value.count ? value.total / value.count : 0,
    roundedScore: value.count ? roundScore(value.total / value.count) : 0,
    name: value.name,
  }));

  const highestRounded = roundedUserAverages.reduce<number | null>((acc, r) => {
    if (acc === null || r.roundedScore > acc) return r.roundedScore;
    return acc;
  }, null);

  const lowestRounded = roundedUserAverages.reduce<number | null>((acc, r) => {
    if (acc === null || r.roundedScore < acc) return r.roundedScore;
    return acc;
  }, null);

  const highestRaters =
    highestRounded == null
      ? []
      : sortRaters(
          roundedUserAverages
            .filter((r) => r.roundedScore === highestRounded)
            .map(({ roundedScore: _rounded, ...rest }) => rest)
        );

  const lowestRaters =
    lowestRounded == null
      ? []
      : sortRaters(
          roundedUserAverages
            .filter((r) => r.roundedScore === lowestRounded)
            .map(({ roundedScore: _rounded, ...rest }) => rest)
        );

  // Return compiled session statistics
  return {
    averageABV,
    averageRating,
    styleStats: {
      uniqueCount: styleCounts.size,
      mostPopular: mostPopularStyle,
    },
    highestRaters,
    lowestRaters,
  };
}
