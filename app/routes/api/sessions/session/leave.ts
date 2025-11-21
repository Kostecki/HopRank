import { and, eq } from "drizzle-orm";
import { data } from "react-router";

import type { Route } from "./+types/leave";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { sessionUsers } from "~/database/schema.server";
import { tryAdvanceSession } from "~/database/utils/tryAdvanceSession.server";
import { extractSessionId } from "~/utils/utils";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
  const sessionId = extractSessionId(params.sessionId);
  const user = await userSessionGet(request);

  if (!user) {
    return data({ message: "User not authenticated" }, { status: 401 });
  }

  try {
    await db
      .update(sessionUsers)
      .set({ active: false })
      .where(
        and(
          eq(sessionUsers.sessionId, sessionId),
          eq(sessionUsers.userId, user.id)
        )
      );

    await tryAdvanceSession(sessionId);

    emitSessionEvent(sessionId, "session:users-changed");
    emitGlobalEvent("sessions:users-changed", {
      sessionId,
    });

    return data({ success: true });
  } catch (error) {
    console.error("Error leaving session:", error);

    return data(
      { message: "Der skete en fejl under afmelding fra smagningen." },
      { status: 500 }
    );
  }
}
