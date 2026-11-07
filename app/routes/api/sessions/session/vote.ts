import { eq } from "drizzle-orm";
import { data } from "react-router";

import { SessionStatus } from "~/types/session";
import type { Route } from "./+types/vote";

import { requireUser } from "~/auth/requireUser.server";
import { db } from "~/database/config.server";
import {
	ratings,
	sessionCriteria,
	sessionState,
} from "~/database/schema.server";
import {
	requireNormalSession,
	requireSessionParticipant,
} from "~/database/utils/assertSessionAccess.server";
import { bumpLastUpdatedAt } from "~/database/utils/bumpLastUpdatedAt.server";
import { tryAdvanceSession } from "~/database/utils/tryAdvanceSession.server";
import { voteSchema } from "~/schemas/vote";
import { extractSessionId } from "~/utils/utils";
import { parseFormJson } from "~/utils/validation.server";
import { emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await requireUser(request);

	await requireSessionParticipant(sessionId, user.id);
	await requireNormalSession(sessionId);

	const formData = await request.formData();
	const vote = parseFormJson(formData, "vote", voteSchema);

	if (vote.sessionId !== sessionId) {
		return data({ message: "Session ID does not match vote" }, { status: 400 });
	}

	if (vote.userId !== user.id) {
		return data({ message: "User ID does not match vote" }, { status: 400 });
	}

	const state = await db.query.sessionState.findFirst({
		where: eq(sessionState.sessionId, sessionId),
	});

	if (!state || state.status !== SessionStatus.active) {
		return data({ message: "Session is not in voting mode" }, { status: 400 });
	}

	if (state.currentBeerId !== vote.beerId) {
		return data(
			{ message: "Beer ID does not match current beer" },
			{ status: 400 },
		);
	}

	const criteriaRows = await db.query.sessionCriteria.findMany({
		where: eq(sessionCriteria.sessionId, sessionId),
		columns: { criterionId: true },
	});
	const sessionCriterionIds = new Set(criteriaRows.map((c) => c.criterionId));

	// Check every rating before writing any, so a bad one can't leave the vote
	// half-saved.
	for (const { criterionId } of vote.ratings) {
		if (!sessionCriterionIds.has(criterionId)) {
			return data({ message: "Invalid criterion in vote" }, { status: 400 });
		}
	}

	try {
		// Saving the vote and advancing are one transaction, so a vote can't be
		// half-saved, and two last votes can't both advance the session.
		db.transaction((tx) => {
			for (const { criterionId, score } of vote.ratings) {
				tx.insert(ratings)
					.values({
						sessionId,
						beerId: vote.beerId,
						userId: user.id,
						criterionId,
						score,
					})
					.onConflictDoUpdate({
						target: [
							ratings.sessionId,
							ratings.beerId,
							ratings.userId,
							ratings.criterionId,
						],
						set: { score },
					})
					.run();
			}

			bumpLastUpdatedAt(sessionId, tx);
			tryAdvanceSession(sessionId, tx);
		});
	} catch (error) {
		console.error("Error saving vote:", error);
		return data({ message: "Din stemme kunne ikke gemmes" }, { status: 500 });
	}

	emitSessionEvent(sessionId, "session:vote");

	return data({ success: true });
}
