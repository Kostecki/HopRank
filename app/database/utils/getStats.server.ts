import { asc, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import type { SessionStats } from "~/types/session";

import { db } from "../config.server";
import { beers, ratings, sessionBeers, users } from "../schema.server";

// Highest Rater - Person with the highest average scores across all beers in the session
// Lowest Rater - Person with the lowest average scores across all beers in the session
// Average ABV - The average ABV of all beers in the session
// Average Rating - The average rating given across all beers in the session
// Most Popular Style - The beer style that appears most frequently in the session
// Number of different styles - Count of unique beer styles in the session

// TODO: handle empty session/no beers
// TODO: Tie handling

export async function getSessionStats(
  sessionId: number
): Promise<SessionStats> {
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

  const styleCounts = db
    .select({
      style: sessionBeerBase.style,
      cnt: sql<number>`count(*)`.as("cnt"),
    })
    .from(sessionBeerBase)
    .groupBy(sessionBeerBase.style)
    .as("style_counts");

  const avgAbvQ = db
    .select({
      avgAbv: sql<number>`COALESCE(avg(${sessionBeerBase.abv}), 0)`.as(
        "avgAbv"
      ),
    })
    .from(sessionBeerBase)
    .as("avg_abv_q");

  const uniqueBeerCountQ = db
    .select({
      uniqueBeerCount: sql<number>`count(*)`.as("uniqueBeerCount"),
    })
    .from(sessionBeerBase)
    .as("unique_beer_count_q");

  const differentStylesQ = db
    .select({
      numberOfDifferentStyles: sql<number>`count(*)`.as(
        "numberOfDifferentStyles"
      ),
    })
    .from(styleCounts)
    .as("different_styles_q");

  const popularStyleQ = db
    .select({
      popularStyle: styleCounts.style,
      popularStyleCount: styleCounts.cnt,
    })
    .from(styleCounts)
    .orderBy(desc(styleCounts.cnt), asc(styleCounts.style))
    .limit(1)
    .as("popular_style_q");

  // Ratings-derived metrics
  const avgRatingQ = db
    .select({
      avgRating: sql<number>`COALESCE(avg(${ratings.score}), 0)`.as(
        "avgRating"
      ),
    })
    .from(ratings)
    .where(eq(ratings.sessionId, sessionId))
    .as("avg_rating_q");

  const userAvgBase = db
    .select({
      userId: ratings.userId,
      userAvgScore: sql<number>`avg(${ratings.score})`.as("userAvgScore"),
    })
    .from(ratings)
    .where(eq(ratings.sessionId, sessionId))
    .groupBy(ratings.userId)
    .as("user_avg_base");

  const userRanks = db
    .select({
      userId: userAvgBase.userId,
      userAvgScore: userAvgBase.userAvgScore,
      rnDesc: sql<number>`
        row_number() over (order by ${userAvgBase.userAvgScore} desc, ${userAvgBase.userId} asc)
      `.as("rnDesc"),
      rnAsc: sql<number>`
        row_number() over (order by ${userAvgBase.userAvgScore} asc, ${userAvgBase.userId} asc)
      `.as("rnAsc"),
    })
    .from(userAvgBase)
    .as("user_ranks");

  const hiLoQ = db
    .select({
      highestRaterId: sql<number>`
        max(case when ${userRanks.rnDesc} = 1 then ${userRanks.userId} end)
      `.as("highestRaterId"),
      highestRaterAvg: sql<number>`
        max(case when ${userRanks.rnDesc} = 1 then ${userRanks.userAvgScore} end)
      `.as("highestRaterAvg"),
      lowestRaterId: sql<number>`
        max(case when ${userRanks.rnAsc} = 1 then ${userRanks.userId} end)
      `.as("lowestRaterId"),
      lowestRaterAvg: sql<number>`
        max(case when ${userRanks.rnAsc} = 1 then ${userRanks.userAvgScore} end)
      `.as("lowestRaterAvg"),
    })
    .from(userRanks)
    .as("hi_lo_q");

  const userHi = alias(users, "users_hi");
  const userLo = alias(users, "users_lo");

  const [row] = await db
    .select({
      avgAbv: avgAbvQ.avgAbv,
      avgRating: avgRatingQ.avgRating,
      uniqueBeerCount: uniqueBeerCountQ.uniqueBeerCount,
      numberOfDifferentStyles: differentStylesQ.numberOfDifferentStyles,
      mostPopularStyle: popularStyleQ.popularStyle,
      mostPopularStyleCount: popularStyleQ.popularStyleCount,
      highestRaterId: hiLoQ.highestRaterId,
      highestRaterAvg: hiLoQ.highestRaterAvg,
      highestRaterName: userHi.name,
      lowestRaterId: hiLoQ.lowestRaterId,
      lowestRaterAvg: hiLoQ.lowestRaterAvg,
      lowestRaterName: userLo.name,
    })
    .from(avgRatingQ)
    .innerJoin(avgAbvQ, sql`1 = 1`)
    .innerJoin(uniqueBeerCountQ, sql`1 = 1`)
    .innerJoin(differentStylesQ, sql`1 = 1`)
    .leftJoin(popularStyleQ, sql`1 = 1`)
    .leftJoin(hiLoQ, sql`1 = 1`)
    .leftJoin(userHi, eq(userHi.id, hiLoQ.highestRaterId))
    .leftJoin(userLo, eq(userLo.id, hiLoQ.lowestRaterId));

  return {
    avgAbv: Number(row?.avgAbv ?? 0),
    avgRating: Number(row?.avgRating ?? 0),
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
    highestRater:
      row?.highestRaterId != null
        ? {
            userId: Number(row.highestRaterId),
            name: row.highestRaterName || null,
            avgScore: Number(row?.highestRaterAvg ?? 0),
          }
        : null,
    lowestRater:
      row?.lowestRaterId != null
        ? {
            userId: Number(row.lowestRaterId),
            name: row.lowestRaterName || null,
            avgScore: Number(row?.lowestRaterAvg ?? 0),
          }
        : null,
  };
}
