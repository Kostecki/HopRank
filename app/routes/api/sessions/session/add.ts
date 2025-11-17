import { data } from "react-router";

import type { Route } from "./+types/add";

import { userSessionGet } from "~/auth/users.server";
import { addBeersToSession } from "~/database/utils/addBeersToSession.server";
import { extractSessionId } from "~/utils/utils";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
  const sessionId = extractSessionId(params.sessionId);
  const user = await userSessionGet(request);

  if (!user) {
    return data({ message: "User not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const beersJson = form.get("beers");
  const beers = JSON.parse(String(beersJson)) as unknown;
  const beerInputs = Array.isArray(beers) ? beers : [beers];

  if (beerInputs.length === 0) {
    return data({ message: "No beers provided" }, { status: 400 });
  }

  try {
    await addBeersToSession(sessionId, beerInputs, user.id);

    emitSessionEvent(sessionId, "session:beer-changed");
    emitGlobalEvent("sessions:beer-changed", {
      sessionId,
    });

    return data({ success: true });
  } catch (error) {
    console.error("Error adding beers:", error);
    return data({ message: "Error adding beer to session" }, { status: 500 });
  }
}
