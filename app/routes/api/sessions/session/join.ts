import { data, redirect } from "react-router";
import { and, eq } from "drizzle-orm";
import { redirectWithSuccess } from "remix-toast";

import { db } from "~/database/config.server";
import { sessions, sessionUsers } from "~/database/schema.server";
import { userSessionGet } from "~/auth/users.server";

import { extractSessionId } from "~/utils/utils";

import type { Route } from "./+types/join";

export async function action({ request, params }: Route.ActionArgs) {
  const sessionId = extractSessionId(params.sessionId);

  const user = await userSessionGet(request);
  if (!user) {
    return data(
      { message: "You must be logged in to join a session" },
      { status: 401 }
    );
  }

  const userId = user?.id;

  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      return data({ message: "Session not found" }, { status: 404 });
    }

    const alreadyJoined = await db.query.sessionUsers.findFirst({
      where: (user) =>
        and(eq(user.sessionId, sessionId), eq(user.userId, userId)),
    });

    if (!alreadyJoined) {
      await db.insert(sessionUsers).values({
        sessionId: sessionId,
        userId,
      });
    }

    return redirect(`/sessions/${sessionId}`);
  } catch (error) {
    console.error("Error joining session:", error);

    return data(
      {
        message:
          "Der skete en fejl under tilmelding til smagningen. Prøv venligst igen.",
      },
      { status: 500 }
    );
  }
}
