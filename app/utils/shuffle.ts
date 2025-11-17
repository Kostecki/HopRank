import { and, eq, ne } from "drizzle-orm";

import { SessionBeerStatus } from "~/types/session";

import { db } from "~/database/config.server";
import { sessionBeers } from "~/database/schema.server";

type BeerRow = {
  id: number;
  beerId: number;
  addedByUserId: number | null;
  breweryName: string;
  style: string;
  order: number | null;
};

/**
 * Scores the given beer list based on how well it avoids repeating brewery, style, and user in adjacent items.
 * Higher scores indicate more variety between neighboring beers.
 *
 * @param list - The list of beers to score.
 * @returns The calculated score as a number.
 */
const scoreBeerOrder = (list: BeerRow[]) => {
  let score = 0;
  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1];
    const curr = list[i];
    if (curr.breweryName !== prev.breweryName) score++;
    if (curr.style !== prev.style) score++;
    if (curr.addedByUserId !== prev.addedByUserId) score++;
  }

  return score;
};

/**
 * Performs an in-place Fisher–Yates shuffle and returns a new array with randomized order.
 *
 * @param array - The array to shuffle.
 * @returns A new shuffled array.
 */
const shuffle = <T>(array: T[]) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
};

/**
 * Shuffles the beers in a session to create a randomized, yet thoughtfully ordered sequence.
 * The shuffle algorithm aims to avoid placing beers from the same brewery, style, or added by the same user consecutively.
 *
 * @param sessionId - The ID of the session whose beers should be shuffled.
 */
export const shuffleBeersInSession = async (sessionId: number) => {
  const rows = await db.query.sessionBeers.findMany({
    where: and(
      eq(sessionBeers.sessionId, sessionId),
      eq(sessionBeers.status, SessionBeerStatus.waiting)
    ),
    with: { beer: true },
  });

  const complete: BeerRow[] = rows
    .filter(
      (row): row is typeof row & { beer: NonNullable<typeof row.beer> } =>
        row.beer !== null
    )
    .map((row) => ({
      id: row.id,
      beerId: row.beer.id,
      addedByUserId: row.addedByUserId,
      breweryName: row.beer.breweryName,
      style: row.beer.style,
      order: row.order,
    }));

  let best: BeerRow[] = complete;
  let bestScore = scoreBeerOrder(complete);

  for (let i = 0; i < 200; i++) {
    const shuffled = shuffle(complete);
    const score = scoreBeerOrder(shuffled);

    if (score > bestScore) {
      best = shuffled;
      bestScore = score;

      const maxScore = (complete.length - 1) * 3;
      if (score === maxScore) break;
    }
  }

  const maxOrderRow = await db.query.sessionBeers.findMany({
    where: and(
      eq(sessionBeers.sessionId, sessionId),
      ne(sessionBeers.status, SessionBeerStatus.waiting)
    ),
    orderBy: (sb, { desc }) => desc(sb.order),
    limit: 1,
  });
  const baseOrder = maxOrderRow[0]?.order ?? -1;

  await Promise.all(
    best.map((beer, index) =>
      db
        .update(sessionBeers)
        .set({ order: baseOrder + index + 1 })
        .where(eq(sessionBeers.id, beer.id))
    )
  );
};
