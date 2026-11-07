import { data } from "react-router";

import type { Route } from "./+types/remove";

import { requireUser } from "~/auth/requireUser.server";
import {
	requireNormalSession,
	requireSessionParticipant,
} from "~/database/utils/assertSessionAccess.server";
import { removeBeersFromSession } from "~/database/utils/removeBeersFromSession.server";
import { extractSessionId } from "~/utils/utils";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const beerId = Number(params.beerId);

	const user = await requireUser(request);

	if (!sessionId || !beerId) {
		return data({ message: "Invalid session or beer ID" }, { status: 400 });
	}

	await requireSessionParticipant(sessionId, user.id);
	await requireNormalSession(sessionId);

	try {
		const removedCount = removeBeersFromSession(sessionId, [beerId], user.id);
		if (removedCount === 0) {
			return data(
				{ message: "Kun dine egne øl, der ikke er smagt endnu, kan fjernes" },
				{ status: 400 },
			);
		}

		emitSessionEvent(sessionId, "session:beer-changed");
		emitGlobalEvent("sessions:beer-changed", {
			sessionId,
		});

		return data({ success: true });
	} catch (error) {
		console.error("Error removing beer:", error);
		return data(
			{ message: "Error removing beer from session" },
			{ status: 500 },
		);
	}
}
