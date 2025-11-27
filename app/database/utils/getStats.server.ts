import { asc, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import type { SessionStats } from "~/types/session";

import { db } from "../config.server";
import { beers, ratings, sessionBeers, users } from "../schema.server";

// Highest Rater: Person with the highest average scores across all beers in the session
// Lowest Rater: Person with the lowest average scores across all beers in the session
// Average ABV: The average ABV of all beers in the session
// Average Rating: The average rating given across all beers in the session
// Most Popular Style: The beer style that appears most frequently in the session
// Number of different styles: Count of unique beer styles in the session

export async function getSessionStats(
  sessionId: number
): Promise<SessionStats> {
  // Base query for beers in the session
  const sessionBeerBase = db
    .select({
      beerId: beers.id,
      style: beers.style,
      abv: beers.abv,
    })
    .from(beers)
    .innerJoin(sessionBeers, eq(beers.id, sessionBeers.beerId))
    .where(eq(sessionBeers.sessionId, sessionId))
    .as("session_beer_base");

  // Consolidated beer stats: average ABV + count of distinct styles
  const beerStatsQuery = db
    .select({
      averageABV: sql<number>`COALESCE(avg(${sessionBeerBase.abv}), 0)`.as(
        "averageABV"
      ),
      numberOfDifferentStyles:
        sql<number>`count(DISTINCT ${sessionBeerBase.style})`.as(
          "numberOfDifferentStyles"
        ),
    })
    .from(sessionBeerBase)
    .as("beer_stats_query");

  // Query to get style counts for beers in the session
  const styleCounts = db
    .select({
      style: sessionBeerBase.style,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(sessionBeerBase)
    .groupBy(sessionBeerBase.style)
    .as("style_counts");

  // Query to get most popular style in the session (by count)
  const popularStyleQuery = db
    .select({
      popularStyle: styleCounts.style,
      popularStyleCount: styleCounts.count,
    })
    .from(styleCounts)
    .orderBy(desc(styleCounts.count), asc(styleCounts.style))
    .limit(1)
    .as("popular_style_query");

  // Query to get average rating across all ratings in the session
  const averageRatingQuery = db
    .select({
      averageRating: sql<number>`COALESCE(avg(${ratings.score}), 0)`.as(
        "averageRating"
      ),
    })
    .from(ratings)
    .where(eq(ratings.sessionId, sessionId))
    .as("average_rating_query");

  // Subquery to calculate average score per user in the session
  const userAvgBase = db
    .select({
      userId: ratings.userId,
      userAvgScore: sql<number>`avg(${ratings.score})`.as("userAvgScore"),
    })
    .from(ratings)
    .where(eq(ratings.sessionId, sessionId))
    .groupBy(ratings.userId)
    .as("user_average_base");

  // Subquery to rank users by their average scores
  const userRanks = db
    .select({
      userId: userAvgBase.userId,
      userAvgScore: userAvgBase.userAvgScore,
      rankDesc: sql<number>`
        dense_rank() over (order by ${userAvgBase.userAvgScore} desc, ${userAvgBase.userId} asc)
      `.as("rankDesc"),
      rankAsc: sql<number>`
        dense_rank() over (order by ${userAvgBase.userAvgScore} asc, ${userAvgBase.userId} asc)
      `.as("rankAsc"),
    })
    .from(userAvgBase)
    .as("user_ranks");

  // Aliases for users table to join for highest and lowest raters
  const usersHigh = alias(users, "users_high");
  const usersLow = alias(users, "users_low");

  // Query to get highest raters in the session
  const highestRatersRows = db
    .select({
      userId: userRanks.userId,
      userAvgScore: userRanks.userAvgScore,
      displayName:
        sql<string>`COALESCE(${usersHigh.name}, ${usersHigh.username})`.as(
          "displayName"
        ),
    })
    .from(userRanks)
    .innerJoin(usersHigh, eq(usersHigh.id, userRanks.userId))
    .where(eq(userRanks.rankDesc, 1))
    .orderBy(
      asc(sql`COALESCE(${usersHigh.name}, ${usersHigh.username})`),
      asc(userRanks.userId)
    )
    .as("highest_raters_rows");

  // Query to get lowest raters in the session
  const lowestRatersRows = db
    .select({
      userId: userRanks.userId,
      userAvgScore: userRanks.userAvgScore,
      displayName:
        sql<string>`COALESCE(${usersLow.name}, ${usersLow.username})`.as(
          "displayName"
        ),
    })
    .from(userRanks)
    .innerJoin(usersLow, eq(usersLow.id, userRanks.userId))
    .where(eq(userRanks.rankAsc, 1))
    .orderBy(
      asc(sql`COALESCE(${usersLow.name}, ${usersLow.username})`),
      asc(userRanks.userId)
    )
    .as("lowest_raters_rows");

  // Aggregation queries to get highest raters as JSON arrays
  const highestRatersAgg = db
    .select({
      highestRatersJson: sql<string>`
        COALESCE(
          json_group_array(
            json_object(
              'userId', ${highestRatersRows.userId},
              'name', ${highestRatersRows.displayName},
              'avgScore', ${highestRatersRows.userAvgScore}
            )
          ),
          '[]'
        )
      `.as("highestRatersJson"),
    })
    .from(highestRatersRows)
    .as("highest_raters_agg");

  // Aggregation queries to get lowest raters as JSON arrays
  const lowestRatersAgg = db
    .select({
      lowestRatersJson: sql<string>`
        COALESCE(
          json_group_array(
            json_object(
              'userId', ${lowestRatersRows.userId},
              'name', ${lowestRatersRows.displayName},
              'avgScore', ${lowestRatersRows.userAvgScore}
            )
          ),
          '[]'
        )
      `.as("lowestRatersJson"),
    })
    .from(lowestRatersRows)
    .as("lowest_raters_agg");

  // Final query to gather all stats together
  const [row] = await db
    .select({
      averageABV: beerStatsQuery.averageABV,
      numberOfDifferentStyles: beerStatsQuery.numberOfDifferentStyles,
      averageRating: averageRatingQuery.averageRating,
      mostPopularStyle: popularStyleQuery.popularStyle,
      mostPopularStyleCount: popularStyleQuery.popularStyleCount,
      highestRaters: highestRatersAgg.highestRatersJson,
      lowestRaters: lowestRatersAgg.lowestRatersJson,
    })
    .from(averageRatingQuery)
    .innerJoin(beerStatsQuery, sql`1 = 1`)
    .leftJoin(popularStyleQuery, sql`1 = 1`)
    .leftJoin(highestRatersAgg, sql`1 = 1`)
    .leftJoin(lowestRatersAgg, sql`1 = 1`);

  // Parse highest and lowest raters from JSON
  const highestRaters: SessionStats["highestRaters"] = row?.highestRaters
    ? JSON.parse(row.highestRaters)
    : [];
  const lowestRaters: SessionStats["lowestRaters"] = row?.lowestRaters
    ? JSON.parse(row.lowestRaters)
    : [];

  // Return the session stats
  return {
    averageABV: Number(row?.averageABV ?? 0),
    averageRating: Number(row?.averageRating ?? 0),
    styleStats: {
      uniqueCount: Number(row?.numberOfDifferentStyles ?? 0),
      mostPopular:
        row?.mostPopularStyle != null
          ? {
              style: String(row.mostPopularStyle),
              count: Number(row?.mostPopularStyleCount ?? 0),
            }
          : null,
    },
    highestRaters,
    lowestRaters,
  };
}
