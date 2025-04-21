import { dataWithError, redirectWithSuccess } from "remix-toast";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { beersTable } from "~/database/schema.server";

import { wait } from "~/utils/utils";

import type { Route } from "../+types";
import type { BeerOption } from "~/types/misc";

export async function action({ params, request }: Route.ActionArgs) {
  const { sessionId } = params;

  const formData = await request.formData();
  const data = formData.get("beers");

  if (!data) {
    console.error("No data received");
    return;
  }

  const user = await userSessionGet(request);
  const beers = JSON.parse(data as string) as BeerOption[];

  await wait(250);

  try {
    await db.insert(beersTable).values(
      beers.map((beer) => ({
        addedBy: user.id,
        sessionId: Number(sessionId),
        untappdBeerId: Number(beer.untappdBeerId),
        name: beer.name,
        style: beer.style,
        breweryName: beer.breweryName,
        label: beer.label,
      }))
    );

    return redirectWithSuccess(
      `/sessions/${sessionId}`,
      "Øl er tilføjet til smagning"
    );
  } catch (error) {
    console.error("Error adding beers to session:", error);
    return dataWithError(null, "Kunne ikke tilføje øl til smagningen");
  }
}
