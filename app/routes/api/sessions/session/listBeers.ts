import { eq } from "drizzle-orm";

import type { Route } from "./+types/listBeers";

import { db } from "~/database/config.server";
import { sessionBeers } from "~/database/schema.server";
import { extractSessionId } from "~/utils/utils";

export async function loader({ params }: Route.LoaderArgs) {
  if (params.sessionId && params.sessionId !== "undefined") {
    const sessionId = extractSessionId(params.sessionId);

    const sessionBeerRows = await db.query.sessionBeers.findMany({
      where: eq(sessionBeers.sessionId, sessionId),
      with: { beer: true },
    });

    return sessionBeerRows;
  }

  return [];
}
