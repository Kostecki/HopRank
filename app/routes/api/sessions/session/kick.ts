import { and, eq } from "drizzle-orm";
import { data } from "react-router";

import { SessionStatus } from "~/types/session";
import type { Route } from "./+types/kick";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { sessionState, sessionUsers } from "~/database/schema.server";
import { requireSessionParticipant } from "~/database/utils/assertSessionAccess.server";
import {
	clearKickVote,
	computeTally,
	getActiveKickVote,
	startKickVote,
} from "~/utils/kickVoteState.server";
import { extractSessionId } from "~/utils/utils";
import { emitSessionEvent } from "~/utils/websocket.server";

const MIN_ELIGIBLE_VOTERS = 2;

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await userSessionGet(request);

	if (!user) {
		return data({ message: "User not authenticated" }, { status: 401 });
	}

	await requireSessionParticipant(sessionId, user.id);

	const formData = await request.formData();
	const targetUserId = Number(formData.get("targetUserId"));

	if (!targetUserId) {
		return data({ message: "Invalid target user" }, { status: 400 });
	}

	if (targetUserId === user.id) {
		return data({ message: "Du kan ikke stemme dig selv ud" }, { status: 400 });
	}

	const state = await db.query.sessionState.findFirst({
		where: eq(sessionState.sessionId, sessionId),
	});

	if (!state || state.status !== SessionStatus.active) {
		return data({ message: "Smagningen er ikke aktiv" }, { status: 400 });
	}

	const activeParticipants = await db.query.sessionUsers.findMany({
		where: and(
			eq(sessionUsers.sessionId, sessionId),
			eq(sessionUsers.active, true),
		),
	});

	const targetIsActive = activeParticipants.some(
		(su) => su.userId === targetUserId,
	);
	if (!targetIsActive) {
		return data(
			{ message: "Deltageren er ikke aktiv i smagningen" },
			{ status: 400 },
		);
	}

	const eligibleVoterIds = activeParticipants
		.map((su) => su.userId)
		.filter((id) => id !== targetUserId);

	if (eligibleVoterIds.length < MIN_ELIGIBLE_VOTERS) {
		return data(
			{ message: "For få deltagere til en afstemning" },
			{ status: 400 },
		);
	}

	const existingVote = getActiveKickVote(sessionId);
	if (existingVote) {
		// Starting a new vote replaces any existing one outright rather than
		// blocking -- e.g. if everyone refreshed mid-vote and it's effectively
		// abandoned, there's otherwise no way to recover short of the
		// VOTE_TIMEOUT_MS timeout.
		clearKickVote(sessionId);
		emitSessionEvent(sessionId, "session:kick-vote-resolved", {
			voteId: existingVote.voteId,
			targetUserId: existingVote.targetUserId,
			kicked: false,
			replaced: true,
		});
	}

	const voteState = startKickVote({
		sessionId,
		initiatorUserId: user.id,
		targetUserId,
		eligibleVoterIds,
	});

	emitSessionEvent(
		sessionId,
		"session:kick-vote-started",
		computeTally(voteState),
	);

	return data({ success: true, voteId: voteState.voteId });
}
