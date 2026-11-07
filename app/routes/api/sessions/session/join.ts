import { eq } from "drizzle-orm";
import { data, redirect } from "react-router";

import type { Route } from "./+types/join";

import { requireUser } from "~/auth/requireUser.server";
import { db } from "~/database/config.server";
import { sessions } from "~/database/schema.server";
import { requireSessionRejoinEligible } from "~/database/utils/assertSessionAccess.server";
import { joinSessionById } from "~/database/utils/joinSessionById.server";
import { extractSessionId } from "~/utils/utils";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);

	const user = await requireUser(request);

	const session = await db.query.sessions.findFirst({
		where: eq(sessions.id, sessionId),
	});
	if (!session) {
		return data({ message: "Session not found" }, { status: 404 });
	}

	// This route re-activates an existing (creator or prior-member)
	// session_users row; first-time joins go through join-by-code only.
	await requireSessionRejoinEligible(session, user.id, sessionId);

	try {
		await joinSessionById({ sessionId, userId: user.id });

		emitSessionEvent(sessionId, "session:users-changed");
		emitGlobalEvent("sessions:users-changed", {
			sessionId,
		});

		return redirect(`/sessions/${sessionId}`);
	} catch (error) {
		console.error("Error joining session:", error);

		return data(
			{
				message:
					"Der skete en fejl under tilmelding til smagningen. Prøv venligst igen.",
			},
			{ status: 500 },
		);
	}
}
