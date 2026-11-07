import { and, eq } from "drizzle-orm";
import { data } from "react-router";

import { SessionUserExitReason } from "~/types/session";
import type { Route } from "./+types/kickVote";

import { requireUser } from "~/auth/requireUser.server";
import { db } from "~/database/config.server";
import { sessionUsers } from "~/database/schema.server";
import { requireSessionParticipant } from "~/database/utils/assertSessionAccess.server";
import { tryAdvanceSession } from "~/database/utils/tryAdvanceSession.server";
import { kickVoteSchema } from "~/schemas/vote";
import {
	clearKickVote,
	computeTally,
	getActiveKickVote,
	kickVoteOutcome,
	recordKickVoteResponse,
} from "~/utils/kickVoteState.server";
import { extractSessionId } from "~/utils/utils";
import { parseFormFields } from "~/utils/validation.server";
import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await requireUser(request);

	await requireSessionParticipant(sessionId, user.id);

	const formData = await request.formData();
	const { voteId, vote } = parseFormFields(formData, kickVoteSchema, [
		"voteId",
		"vote",
	]);

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
		db.transaction((tx) => {
			tx.update(sessionUsers)
				.set({ active: false, exitReason: SessionUserExitReason.kicked })
				.where(
					and(
						eq(sessionUsers.sessionId, sessionId),
						eq(sessionUsers.userId, state.targetUserId),
					),
				)
				.run();

			// The kicked user no longer counts, so everyone else may have voted.
			tryAdvanceSession(sessionId, tx);
		});

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
