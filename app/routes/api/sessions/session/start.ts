import { eq } from "drizzle-orm";
import { data } from "react-router";

import { SessionStatus } from "~/types/session";
import type { Route } from "./+types/start";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { sessionState } from "~/database/schema.server";
import { extractSessionId } from "~/utils/utils";
import { emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
  const sessionId = extractSessionId(params.sessionId);
  const user = await userSessionGet(request);

  if (!user) {
    return data({ message: "User not authenticated" }, { status: 401 });
  }

  try {
    await db
      .update(sessionState)
      .set({ status: SessionStatus.active })
      .where(eq(sessionState.sessionId, sessionId));

    emitSessionEvent(sessionId, "session:started");

    return data({ success: true });
  } catch (error) {
    console.error("Error starting session:", error);
    return data({ message: "Fejl ved start af session" }, { status: 500 });
  }
}
