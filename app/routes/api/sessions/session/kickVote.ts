import { and, eq } from "drizzle-orm";
import { data } from "react-router";

import { SessionUserExitReason } from "~/types/session";
import type { Route } from "./+types/kickVote";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { sessionUsers } from "~/database/schema.server";
import { requireSessionParticipant } from "~/database/utils/assertSessionAccess.server";
import { tryAdvanceSession } from "~/database/utils/tryAdvanceSession.server";
import {
	clearKickVote,
	computeTally,
	getActiveKickVote,
	kickVoteOutcome,
	recordKickVoteResponse,
} from "~/utils/kickVoteState.server";
import { extractSessionId } from "~/utils/utils";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await userSessionGet(request);

	if (!user) {
		return data({ message: "User not authenticated" }, { status: 401 });
	}

	await requireSessionParticipant(sessionId, user.id);

	const formData = await request.formData();
	const voteId = String(formData.get("voteId"));
	const vote = formData.get("vote") === "true";

	const state = getActiveKickVote(sessionId);
	if (!state || state.voteId !== voteId) {
		return data(
			{ message: "Afstemningen findes ikke længere" },
			{ status: 410 },
		);
	}

	if (!state.eligibleVoterIds.includes(user.id)) {
		return data(
			{ message: "Du kan ikke stemme i denne afstemning" },
			{ status: 403 },
		);
	}

	recordKickVoteResponse(sessionId, user.id, vote);
	const tally = computeTally(state);
	const outcome = kickVoteOutcome(tally);

	if (outcome === "pending") {
		emitSessionEvent(sessionId, "session:kick-vote-updated", tally);
		return data({ success: true, outcome });
	}

	const kicked = outcome === "passed";

	if (kicked) {
		await db
			.update(sessionUsers)
			.set({ active: false, exitReason: SessionUserExitReason.kicked })
			.where(
				and(
					eq(sessionUsers.sessionId, sessionId),
					eq(sessionUsers.userId, state.targetUserId),
				),
			);

		await tryAdvanceSession(sessionId);

		emitSessionEvent(sessionId, "session:users-changed");
		emitGlobalEvent("sessions:users-changed", { sessionId });
	}

	clearKickVote(sessionId);
	emitSessionEvent(sessionId, "session:kick-vote-resolved", {
		voteId: state.voteId,
		targetUserId: state.targetUserId,
		kicked,
	});

	return data({ success: true, outcome });
}
