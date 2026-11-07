import { and, asc, eq } from "drizzle-orm";

import { SessionBeerStatus, SessionMode, SessionStatus } from "~/types/session";

import { db, type Transaction } from "../config.server";
import {
	ratings,
	sessionBeers,
	sessionCriteria,
	sessionState,
	sessions,
	sessionUsers,
} from "../schema.server";
import { advanceBars } from "./oneBeer.server";

/**
 * Moves the session on to the next beer (or bar) once every active
 * participant has voted on the current one.
 *
 * Pass `tx` to make it part of a larger transaction. Either way the check and
 * the advance run in one transaction, so two votes arriving together can't
 * both see "everyone voted" and advance twice.
 */
export const tryAdvanceSession = (sessionId: number, tx?: Transaction) => {
	if (!tx) {
		db.transaction((t) => tryAdvanceSession(sessionId, t));
		return;
	}

	const session = tx
		.select({ mode: sessions.mode })
		.from(sessions)
		.where(eq(sessions.id, sessionId))
		.get();

	if (session?.mode === SessionMode.oneBeer) {
		advanceBars(sessionId, tx);
		return;
	}

	const state = tx
		.select()
		.from(sessionState)
		.where(eq(sessionState.sessionId, sessionId))
		.get();

	if (!state || state.status !== SessionStatus.active || !state.currentBeerId) {
		return;
	}
	const currentBeerId = state.currentBeerId;

	const users = tx
		.select({ userId: sessionUsers.userId })
		.from(sessionUsers)
		.where(
			and(eq(sessionUsers.sessionId, sessionId), eq(sessionUsers.active, true)),
		)
		.all();

	// Do nothing if the session has been abandoned (no active voters):
	// .every() on an empty array is vacuously true and would otherwise
	// auto-advance with zero votes.
	if (users.length === 0) {
		return;
	}

	const criteriaCount = tx
		.select({ id: sessionCriteria.id })
		.from(sessionCriteria)
		.where(eq(sessionCriteria.sessionId, sessionId))
		.all().length;

	const submittedRatings = tx
		.select({ userId: ratings.userId, criterionId: ratings.criterionId })
		.from(ratings)
		.where(
			and(eq(ratings.sessionId, sessionId), eq(ratings.beerId, currentBeerId)),
		)
		.all();

	// Count coverage per currently-active user rather than a raw total: a raw
	// count can be satisfied by stale rating rows from a user who has since
	// left the session, advancing before every active user has voted.
	const votedCriteriaByUser = new Map<number, Set<number>>();
	for (const rating of submittedRatings) {
		const votedCriteria = votedCriteriaByUser.get(rating.userId) ?? new Set();
		votedCriteria.add(rating.criterionId);
		votedCriteriaByUser.set(rating.userId, votedCriteria);
	}

	const allActiveUsersVoted = users.every(
		({ userId }) =>
			(votedCriteriaByUser.get(userId)?.size ?? 0) >= criteriaCount,
	);
	if (!allActiveUsersVoted) {
		return;
	}

	const allBeers = tx
		.select()
		.from(sessionBeers)
		.where(eq(sessionBeers.sessionId, sessionId))
		.orderBy(asc(sessionBeers.order))
		.all();

	if (allBeers.every((b) => b.status === SessionBeerStatus.rated)) {
		return;
	}

	const currentIndex = allBeers.findIndex((b) => b.beerId === currentBeerId);
	const currentBeer = allBeers[currentIndex];
	const nextBeer = allBeers
		.slice(currentIndex + 1)
		.find((b) => b.status === SessionBeerStatus.waiting);

	if (currentBeer) {
		tx.update(sessionBeers)
			.set({ status: SessionBeerStatus.rated })
			.where(eq(sessionBeers.id, currentBeer.id))
			.run();
	}

	if (nextBeer) {
		tx.update(sessionBeers)
			.set({ status: SessionBeerStatus.rating })
			.where(eq(sessionBeers.id, nextBeer.id))
			.run();
	}

	tx.update(sessionState)
		.set({
			currentBeerId: nextBeer?.beerId ?? null,
			currentBeerOrder: nextBeer?.order ?? null,
		})
		.where(eq(sessionState.sessionId, sessionId))
		.run();
};
