import { data } from "react-router";

import { userSessionGet } from "~/auth/users.server";
import { removeBeersFromSession } from "~/database/utils/removeBeersFromSession.server";

import { extractSessionId } from "~/utils/utils";

import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";
import type { Route } from "./+types/remove";

export async function action({ request, params }: Route.ActionArgs) {
  const sessionId = extractSessionId(params.sessionId);
  const beerId = Number(params.beerId);

  const user = await userSessionGet(request);
  if (!user) {
    return data({ message: "User not authenticated" }, { status: 401 });
  }

  if (!sessionId || !beerId) {
    return data({ message: "Invalid session or beer ID" }, { status: 400 });
  }

  try {
    await removeBeersFromSession(sessionId, [beerId], user.id);

    emitSessionEvent(sessionId, "session:beer-changed");
    emitGlobalEvent("sessions:beer-changed", {
      sessionId,
    });

    return data({ success: true });
  } catch (error) {
    console.error("Error removing beer:", error);
    return data(
      { message: "Error removing beer from session" },
      { status: 500 }
    );
  }
}
