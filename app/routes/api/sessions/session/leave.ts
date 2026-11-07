import { and, eq } from "drizzle-orm";
import { data } from "react-router";

import { SessionUserExitReason } from "~/types/session";
import type { Route } from "./+types/leave";

import { requireUser } from "~/auth/requireUser.server";
import { db } from "~/database/config.server";
import { sessionUsers } from "~/database/schema.server";
import { requireSessionParticipant } from "~/database/utils/assertSessionAccess.server";
import { tryAdvanceSession } from "~/database/utils/tryAdvanceSession.server";
import { clearKickVote, getActiveKickVote } from "~/utils/kickVoteState.server";
import { extractSessionId } from "~/utils/utils";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await requireUser(request);

	await requireSessionParticipant(sessionId, user.id);

	try {
		db.transaction((tx) => {
			tx.update(sessionUsers)
				.set({ active: false, exitReason: SessionUserExitReason.left })
				.where(
					and(
						eq(sessionUsers.sessionId, sessionId),
						eq(sessionUsers.userId, user.id),
					),
				)
				.run();

			// The leaver no longer counts, so everyone else may have voted.
			tryAdvanceSession(sessionId, tx);
		});

		// If this user was the target of an in-progress kick vote, clear it and
		// let everyone's modal close cleanly instead of voting on someone who's
		// already gone.
		const activeVote = getActiveKickVote(sessionId);
		if (activeVote?.targetUserId === user.id) {
			clearKickVote(sessionId);
			emitSessionEvent(sessionId, "session:kick-vote-resolved", {
				voteId: activeVote.voteId,
				targetUserId: user.id,
				kicked: false,
			});
		}

		emitSessionEvent(sessionId, "session:users-changed");
		emitGlobalEvent("sessions:users-changed", {
			sessionId,
		});

		return data({ success: true });
	} catch (error) {
		console.error("Error leaving session:", error);

		return data(
			{ message: "Der skete en fejl under afmelding fra smagningen." },
			{ status: 500 },
		);
	}
}
