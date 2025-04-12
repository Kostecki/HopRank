import { dataWithError, dataWithSuccess } from "remix-toast";

import { db } from "~/database/config.server";
import { votesTable } from "~/database/schema.server";

import type { Route } from "../$sessionId/+types";
import { wait } from "~/utils/utils";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const data = formData.get("vote");

  if (!data) {
    console.error("No data received");
    return;
  }

  const vote = JSON.parse(data as string);

  try {
    await wait(250);

    await db
      .insert(votesTable)
      .values({
        sessionId: vote.sessionId,
        userId: vote.userId,
        beerId: vote.id,
        vote: vote.ratings,
      })
      .onConflictDoUpdate({
        target: [votesTable.sessionId, votesTable.userId, votesTable.beerId],
        set: {
          vote: vote.ratings,
        },
      });

    return dataWithSuccess(null, "Din bedømmelse er registreret");
  } catch (error) {
    console.error("Error inserting vote:", error);
    return dataWithError(null, "Kunne ikke gemme bedømmelse");
  }
}
