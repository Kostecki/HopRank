import { redirect } from "react-router";
import { eq } from "drizzle-orm";
import { dataWithError } from "remix-toast";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import {
  beersTable,
  sessionsTable,
  usersTable,
} from "~/database/schema.server";
import { generateUniqueSessionName } from "~/database/helpers";

import type { Route } from "../$sessionId/+types";

type BeerOption = {
  beerId: string;
  name: string;
  style: string;
  breweryName: string;
  label: string;
};

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const data = formData.get("beers");

  if (!data) {
    console.error("No data received");
    return;
  }

  const user = await userSessionGet(request);
  const beers = JSON.parse(data as string) as BeerOption[];

  const name = await generateUniqueSessionName();

  try {
    const [session] = await db
      .insert(sessionsTable)
      .values({ name })
      .returning({ sessionId: sessionsTable.id });

    if (!session || !session.sessionId) {
      console.error("No session ID returned");
      return dataWithError(null, "Fejl ved oprettelse af smagning");
    }

    const sessionId = session.sessionId;

    try {
      await db
        .update(usersTable)
        .set({ activeSessionId: sessionId })
        .where(eq(usersTable.id, user.id));
    } catch (error) {
      console.error("Error updating user active session:", error);
      return dataWithError(null, "Kunne ikke sætte aktiv smagning for bruger");
    }

    if (beers.length) {
      try {
        await db.insert(beersTable).values(
          beers.map((beer) => ({
            addedBy: user.id,
            sessionId,
            beerId: Number(beer.beerId),
            name: beer.name,
            style: beer.style,
            breweryName: beer.breweryName,
            label: beer.label,
          }))
        );

        return redirect(`/sessions/${sessionId}`);
      } catch (error) {
        console.error("Error inserting beers into session:", error);
        return dataWithError(null, "Kunne ikke tilføje øl til smagning");
      }
    }
  } catch (error) {
    console.error("Error inserting session:", error);
    return dataWithError(null, "Fejl ved oprettelse af smagning");
  }
}
