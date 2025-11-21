import { eq } from "drizzle-orm";

import type { Route } from "./+types/listBeers";

import { db } from "~/database/config.server";
import { beers, sessionBeers } from "~/database/schema.server";
import { extractSessionId } from "~/utils/utils";

export async function loader({ params }: Route.LoaderArgs) {
  if (params.sessionId && params.sessionId !== "undefined") {
    const sessionId = extractSessionId(params.sessionId);

    const sessionBeerRows = await db
      .select({
        sessionBeer: sessionBeers,
        beer: beers,
      })
      .from(sessionBeers)
      .innerJoin(beers, eq(sessionBeers.beerId, beers.id))
      .where(eq(sessionBeers.sessionId, sessionId));

    return sessionBeerRows.map(({ sessionBeer, beer }) => ({
      ...sessionBeer,
      beer,
    }));
  }

  return [];
}
