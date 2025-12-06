import { and, eq } from "drizzle-orm";

import { SessionBeerStatus, SessionStatus } from "~/types/session";

import { shuffleBeersInSession } from "~/utils/shuffle";

import { db } from "../config.server";
import { beers, sessionBeers, sessionState } from "../schema.server";
import { bumpLastUpdatedAt } from "./bumpLastUpdatedAt.server";

type BeerInput = {
  untappdBeerId: number;
  name: string;
  breweryName: string;
  abv: number;
  style: string;
  label: string;
  label_hd?: string;
};

export const addBeersToSession = async (
  sessionId: number,
  beerInputs: BeerInput[],
  userId: number
) => {
  if (beerInputs.length === 0) {
    return;
  }

  const sessionBeersToInsert = [];
  for (const beerData of beerInputs) {
    const { untappdBeerId, name, breweryName, abv, style, label, label_hd } =
      beerData;

    if (!untappdBeerId || !name || !breweryName || !abv || !style || !label) {
      continue;
    }

    const existingBeer = await db.query.beers.findFirst({
      where: eq(beers.untappdBeerId, untappdBeerId),
    });

    let beerId: number;

    if (existingBeer) {
      beerId = existingBeer.id;
    } else {
      const [newBeer] = await db
        .insert(beers)
        .values({
          untappdBeerId,
          name,
          breweryName,
          abv,
          style,
          label,
          label_hd,
        })
        .returning();

      beerId = newBeer.id;
    }

    const baseInsert = {
      sessionId,
      beerId,
      userId,
      addedByUserId: userId,
      status: SessionBeerStatus.waiting,
    };

    if (beerInputs.length === 1) {
      const lastOrdered = await db.query.sessionBeers.findMany({
        where: eq(sessionBeers.sessionId, sessionId),
        orderBy: (sb, { desc }) => desc(sb.order),
        limit: 1,
      });
      const currentMaxOrder = lastOrdered[0]?.order ?? -1;

      sessionBeersToInsert.push({
        ...baseInsert,
        order: currentMaxOrder + 1,
      });
    } else {
      sessionBeersToInsert.push(baseInsert);
    }
  }

  if (sessionBeersToInsert.length > 0) {
    await db.insert(sessionBeers).values(sessionBeersToInsert);

    if (sessionBeersToInsert.length > 1) {
      await shuffleBeersInSession(sessionId);
    }

    const state = await db.query.sessionState.findFirst({
      where: eq(sessionState.sessionId, sessionId),
    });

    // If there is no current beer then set the first beer in the session as the current beer
    if (!state?.currentBeerId && state?.status === SessionStatus.active) {
      const ordered = await db.query.sessionBeers.findMany({
        where: and(
          eq(sessionBeers.sessionId, sessionId),
          eq(sessionBeers.status, SessionBeerStatus.waiting)
        ),
        orderBy: (sb, { asc }) => asc(sb.order),
      });

      const firstBeer = ordered[0];
      if (firstBeer) {
        await db
          .update(sessionState)
          .set({
            currentBeerId: firstBeer.beerId,
            currentBeerOrder: firstBeer.order,
          })
          .where(eq(sessionState.sessionId, sessionId));

        await db
          .update(sessionBeers)
          .set({ status: SessionBeerStatus.rating })
          .where(eq(sessionBeers.id, firstBeer.id));
      }
    } else {
      //
      await bumpLastUpdatedAt(sessionId);
    }
  }
};
