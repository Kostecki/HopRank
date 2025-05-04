import { data } from "react-router";
import { redirectWithSuccess } from "remix-toast";

import { db } from "~/database/config.server";
import {
  sessionCriteria,
  sessions,
  sessionState,
  sessionUsers,
} from "~/database/schema.server";
import { userSessionGet } from "~/auth/users.server";

import { addBeersToSession } from "~/database/utils/addBeersToSession.server";
import { emitGlobalEvent } from "~/utils/websocket.server";

import type { Route } from "./+types/sessions";
import { generateJoinCode } from "~/utils/utils";
import { eq } from "drizzle-orm";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const sessionName = formData.get("name");
  const beersJson = formData.get("beers");
  const criteriaJson = formData.get("criteria");

  const user = await userSessionGet(request);
  const userId = user?.id;

  if (!userId) {
    return data({ message: "User not authenticated" }, { status: 401 });
  }

  // Step unique join code
  let joinCode = generateJoinCode();
  let exists = true;
  while (exists) {
    const existingSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.joinCode, joinCode))
      .execute();

    if (existingSession.length === 0) {
      exists = false;
    } else {
      joinCode = generateJoinCode();
    }
  }

  let session;
  try {
    const name = String(sessionName);
    const [createdSession] = await db
      .insert(sessions)
      .values({ name, createdBy: userId, joinCode })
      .returning();

    session = createdSession;
  } catch (error: any) {
    console.error("Unexpected DB error while creating session:", error);
    return data(
      { message: "Kunne ikke oprette smagningen. Prøv igen senere." },
      { status: 500 }
    );
  }

  const criteriaInput = JSON.parse(String(criteriaJson)) ?? [];
  if (criteriaInput.length === 0) {
    return data(
      { message: "En smagning skal have mindst ét bedømmelseskriterie." },
      { status: 400 }
    );
  }

  try {
    await db.insert(sessionCriteria).values(
      criteriaInput.map((criterionId: number) => ({
        sessionId: session.id,
        criterionId,
      }))
    );
  } catch (error) {
    console.error("Error inserting session criteria:", error);

    return data(
      { message: "Der skete en fejl under oprettelsen af smagningen." },
      { status: 500 }
    );
  }

  try {
    await db.insert(sessionUsers).values({
      sessionId: session.id,
      userId,
    });

    await db.insert(sessionState).values({
      sessionId: session.id,
    });

    const beersInput = JSON.parse(String(beersJson)) ?? [];

    if (Array.isArray(beersInput) && beersInput.length > 0) {
      await addBeersToSession(session.id, beersInput, userId);
    }

    emitGlobalEvent("sessions:created");

    return redirectWithSuccess(`/sessions/${session.id}`, "Smagning oprettet");
  } catch (error) {
    console.error("Error post-creation (join/add beers):", error);

    return data(
      {
        message:
          "Der skete en fejl under oprettelsen af smagningen. Prøv venligst igen.",
      },
      { status: 500 }
    );
  }
}
