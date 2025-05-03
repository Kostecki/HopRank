import { eq } from "drizzle-orm";

import { db } from "~/database/config.server";
import {
  sessionBeers,
  sessionCriteria,
  sessionState,
} from "~/database/schema.server";

import { extractSessionId } from "~/utils/utils";

import type { Route } from "./+types/current";

export async function loader({ params }: Route.LoaderArgs) {
  const sessionId = extractSessionId(params.sessionId);

  const sessionStateRow = await db.query.sessionState.findFirst({
    where: eq(sessionState.sessionId, sessionId),
  });

  let currentBeer = null;

  if (sessionStateRow?.currentBeerId) {
    const beerRow = await db.query.sessionBeers.findFirst({
      where: eq(sessionBeers.beerId, sessionStateRow.currentBeerId),
      with: {
        beer: true,
      },
    });

    if (beerRow && beerRow.beer) {
      currentBeer = {
        id: beerRow.beer.id,
        name: beerRow.beer.name,
        breweryName: beerRow.beer.breweryName,
        style: beerRow.beer.style,
        label: beerRow.beer.label,
        order: beerRow.order,
      };
    }
  }

  const criteriaRows = await db.query.sessionCriteria.findMany({
    where: eq(sessionCriteria.sessionId, sessionId),
    with: {
      criterion: true,
    },
  });

  const criteria = criteriaRows
    .filter((row) => row.criterion !== null)
    .map((row) => ({
      id: row.criterion!.id,
      name: row.criterion!.name,
      weight: row.criterion!.weight,
    }));

  return {
    sessionId,
    currentBeer,
    criteria,
    status: sessionStateRow?.status,
  };
}
