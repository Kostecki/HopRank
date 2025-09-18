import { eq } from "drizzle-orm";
import { data, redirect } from "react-router";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { sessions } from "~/database/schema.server";

import { joinSessionById } from "~/database/utils/joinSessionById.server";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

import type { Route } from "./+types/joinByCode";

export async function action({ request, params }: Route.ActionArgs) {
  const joinCode = params.joinCode;

  if (!joinCode) {
    return data({ message: "Pinkoden mangler" }, { status: 400 });
  }

  const user = await userSessionGet(request);
  if (!user) {
    return data(
      { message: "You must be logged in to join a session" },
      { status: 401 }
    );
  }

  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.joinCode, joinCode),
    });

    if (!session) {
      return data({ message: "Pinkoden er ikke gyldig" }, { status: 404 });
    }

    await joinSessionById({ sessionId: session.id, userId: user.id });

    emitSessionEvent(session.id, "session:users-changed");
    emitGlobalEvent("sessions:users-changed", {
      sessionId: session.id,
    });

    return redirect(`/sessions/${session.id}`);
  } catch (error) {
    console.error("Error joining session by code:", error);
    return data(
      {
        message:
          "Der skete en fejl under tilmelding til smagningen. Prøv venligst igen.",
      },
      { status: 500 }
    );
  }
}
