import { eq } from "drizzle-orm";
import { createNameId } from "mnemonic-id";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import {
  beersTable,
  sessionsTable,
  usersTable,
} from "~/database/schema.server";

import { handleToastResponse } from "~/utils/toasts";

export async function CreateSessionAction(request: Request) {
  const user = await userSessionGet(request);

  const formData = await request.formData();
  const selectedBeers = formData.get("selectedBeerIds");

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    const name = createNameId();

    try {
      const result = await db
        .insert(sessionsTable)
        .values({ name })
        .returning({ sessionId: sessionsTable.id });

      if (!result.length || !result[0].sessionId) {
        console.error("Error creating session:", result);
        return handleToastResponse("Fejl ved oprettelse af session", "error");
      }

      const sessionId = result[0].sessionId;

      // Add session id to current users active session
      try {
        await db
          .update(usersTable)
          .set({ activeSessionId: sessionId })
          .where(eq(usersTable.id, user.id));
      } catch (error) {
        console.error("Error updating user active session:", error);
      }

      if (selectedBeers && typeof selectedBeers === "string") {
        const beerIds = JSON.parse(selectedBeers);

        try {
          await db.insert(beersTable).values(
            beerIds.map((beerId: number) => ({
              sessionId,
              beerId,
            }))
          );

          return handleToastResponse("Smagning, med øl, oprettet", "success");
        } catch (error) {
          console.error("Error inserting session beers:", error);
          return handleToastResponse(
            "Fejl ved oprettelse af smagning med øl",
            "error"
          );
        }
      }

      return handleToastResponse("Smagning oprettet", "success");
    } catch (error: any) {
      // TODO: Use a more specific error type
      if (error.message.includes("UNIQUE constraint failed")) {
        console.warn(`Duplicate name generated (${name}), retrying...`);
        continue;
      }

      console.error("Unexpected error creating session:", error);
      return handleToastResponse("Fejl ved oprettelse af session", "error");
    }
  }

  console.error("Error creating session: Max retries reached.");
  return handleToastResponse("Fejl ved oprettelse af session", "error");
}

export async function GetSessionBeersAction(request: Request) {
  const formData = await request.formData();
  const sessionId = formData.get("sessionId");
  console.log("Session ID from formData:", sessionId);

  try {
    const result = await db
      .select()
      .from(beersTable)
      .where(eq(beersTable.sessionId, 1));

    console.log("Session beers result:", result);
  } catch (error) {
    console.error("Error fetching session beers:", error);
    return handleToastResponse("Fejl ved hentning af øl for smagning", "error");
  }
}
