import { eq } from "drizzle-orm";
import { data, redirect } from "react-router";

import type { Route } from "./+types/sessions";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { sessions } from "~/database/schema.server";
import type { SelectSessions } from "~/database/schema.types";
import { addBeersToSession } from "~/database/utils/addBeersToSession.server";
import { createSessionWithCriteria } from "~/database/utils/createSessionWithCriteria.server";
import { joinSessionById } from "~/database/utils/joinSessionById.server";
import { generateJoinCode } from "~/utils/utils";
import { emitGlobalEvent } from "~/utils/websocket.server";

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

  const criteriaInput = JSON.parse(String(criteriaJson)) ?? [];
  if (criteriaInput.length === 0) {
    return data(
      { message: "En smagning skal have mindst ét bedømmelseskriterie." },
      { status: 400 }
    );
  }

  const generateUniqueJoinCode = async () => {
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
    return joinCode;
  };

  const isJoinCodeConflict = (error: unknown) =>
    error instanceof Error &&
    (error as Error & { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE";

  let session: SelectSessions | undefined;
  let lastError: unknown;

  // Retry once with a fresh join code: the uniqueness check above and the
  // insert aren't atomic, so a concurrent request can win the race.
  for (let attempt = 0; attempt < 2 && !session; attempt++) {
    const joinCode = await generateUniqueJoinCode();
    try {
      session = createSessionWithCriteria({
        name: String(sessionName),
        createdBy: userId,
        joinCode,
        criterionIds: criteriaInput,
      });
    } catch (error) {
      lastError = error;
      if (!isJoinCodeConflict(error)) break;
    }
  }

  if (!session) {
    console.error("Unexpected DB error while creating session:", lastError);
    return data(
      { message: "Kunne ikke oprette smagningen. Prøv igen senere." },
      { status: 500 }
    );
  }

  try {
    await joinSessionById({
      sessionId: session.id,
      userId,
    });

    const beersInput = JSON.parse(String(beersJson)) ?? [];

    if (Array.isArray(beersInput) && beersInput.length > 0) {
      await addBeersToSession(session.id, beersInput, userId);
    }

    emitGlobalEvent("sessions:created");

    return redirect(`/sessions/${session.id}`);
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
