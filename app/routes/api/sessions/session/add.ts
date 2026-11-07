import { data } from "react-router";

import type { Route } from "./+types/add";

import { requireUser } from "~/auth/requireUser.server";
import { addBeersToSession } from "~/database/utils/addBeersToSession.server";
import {
	requireNormalSession,
	requireSessionParticipant,
} from "~/database/utils/assertSessionAccess.server";
import { beersToAddSchema } from "~/schemas/session";
import { extractSessionId } from "~/utils/utils";
import { parseFormJson } from "~/utils/validation.server";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await requireUser(request);

	await requireSessionParticipant(sessionId, user.id);
	await requireNormalSession(sessionId);

	const form = await request.formData();
	const beerInputs = parseFormJson(form, "beers", beersToAddSchema);

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
