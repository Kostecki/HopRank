import { data } from "react-router";

import type { Route } from "./+types/barsSync";

import { requireUser } from "~/auth/requireUser.server";
import { requireSessionParticipant } from "~/database/utils/assertSessionAccess.server";
import { syncVenueDetails } from "~/database/utils/oneBeer.server";
import { venueListSchema } from "~/schemas/oneBeer";
import { extractSessionId } from "~/utils/utils";
import { parseFormJson } from "~/utils/validation.server";
import { emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await requireUser(request);

	await requireSessionParticipant(sessionId, user.id);

	const form = await request.formData();
	const venues = parseFormJson(form, "venues", venueListSchema);

	const changedCount = syncVenueDetails(sessionId, venues);

	if (changedCount > 0) {
		emitSessionEvent(sessionId, "session:beer-changed");
	}

	return data({ success: true, changedCount });
}
