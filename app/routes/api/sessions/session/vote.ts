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

	for (const { criterionId, score } of vote.ratings) {
		const { beerId } = vote;

		try {
			await db
				.insert(ratings)
				.values({
					sessionId,
					beerId,
					userId: user.id,
					criterionId: criterionId,
					score: score,
				})
				.onConflictDoUpdate({
					target: [
						ratings.sessionId,
						ratings.beerId,
						ratings.userId,
						ratings.criterionId,
					],
					set: {
						score,
					},
				});
		} catch (error) {
			console.error("Error inserting/updating rating:", error);

			return data(
				{ message: "Error inserting/updating rating" },
				{ status: 500 },
			);
		}
	}

	await bumpLastUpdatedAt(sessionId);
	await tryAdvanceSession(sessionId);

	emitSessionEvent(sessionId, "session:vote");

	return data({ success: true });
}
