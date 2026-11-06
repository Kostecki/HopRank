import { eq } from "drizzle-orm";
import { data } from "react-router";

import { SessionStatus } from "~/types/session";
import type { Route } from "./+types/finish";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { sessionState, sessions } from "~/database/schema.server";
import { requireSessionOwnerOrAdmin } from "~/database/utils/assertSessionAccess.server";
import { finishSessions } from "~/database/utils/finishSessions.server";
import { clearKickVote, getActiveKickVote } from "~/utils/kickVoteState.server";
import { extractSessionId } from "~/utils/utils";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await userSessionGet(request);

	if (!user) {
		return data({ message: "User not authenticated" }, { status: 401 });
	}

	const session = await db.query.sessions.findFirst({
		where: eq(sessions.id, sessionId),
	});

	if (!session) {
		return data({ message: "Session not found" }, { status: 404 });
	}

	requireSessionOwnerOrAdmin(session, user);

	const state = await db.query.sessionState.findFirst({
		where: eq(sessionState.sessionId, sessionId),
	});

	// A session that never got started can be ended too, or it would stay open.
	if (
		state?.status !== SessionStatus.active &&
		state?.status !== SessionStatus.created
	) {
		return data(
			{ message: "Smagningen er allerede afsluttet" },
			{ status: 400 },
		);
	}

	try {
		finishSessions([sessionId]);
	} catch (error) {
		console.error("Error finishing session:", error);

		return data(
			{ message: "Der skete en fejl under afslutning af smagningen." },
			{ status: 500 },
		);
	}

	// There's nobody left to vote on, so close any open kick vote.
	const activeVote = getActiveKickVote(sessionId);
	if (activeVote) {
		clearKickVote(sessionId);
		emitSessionEvent(sessionId, "session:kick-vote-resolved", {
			voteId: activeVote.voteId,
			targetUserId: activeVote.targetUserId,
			kicked: false,
		});
	}

	// Sends everyone on the session page to the results.
	emitSessionEvent(sessionId, "session:users-changed");
	emitGlobalEvent("sessions:users-changed", { sessionId });

	return data({ success: true });
}
