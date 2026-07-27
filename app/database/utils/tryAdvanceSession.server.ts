import { and, eq } from "drizzle-orm";

import { SessionBeerStatus, SessionStatus } from "~/types/session";

import { db } from "../config.server";
import {
	ratings,
	sessionBeers,
	sessionCriteria,
	sessionState,
	sessionUsers,
} from "../schema.server";

export const tryAdvanceSession = async (sessionId: number) => {
	const state = await db.query.sessionState.findFirst({
		where: eq(sessionState.sessionId, sessionId),
	});

	if (!state || state.status !== SessionStatus.active || !state.currentBeerId) {
		return;
	}

	const [users, criteriaList, submittedRatings] = await Promise.all([
		db.query.sessionUsers.findMany({
			where: and(
				eq(sessionUsers.sessionId, sessionId),
				eq(sessionUsers.active, true),
			),
		}),
		db.query.sessionCriteria.findMany({
			where: eq(sessionCriteria.sessionId, sessionId),
		}),
		db.query.ratings.findMany({
			where: and(
				eq(ratings.sessionId, sessionId),
				eq(ratings.beerId, state.currentBeerId),
			),
		}),
	]);

	// Do nothing if the session has been abandoned (no active voters) —
	// .every() on an empty array is vacuously true and would otherwise
	// auto-advance with zero votes.
	if (users.length === 0) {
		return;
	}

	// Count coverage per currently-active user rather than a raw total: a
	// raw count (submittedRatings.length >= users.length * criteria.length)
	// can be satisfied by stale rating rows from a user who has since left
	// the session, wrongly advancing the beer before every still-active
	// user has actually voted.
	const votedCriteriaByUser = new Map<number, Set<number>>();
	for (const rating of submittedRatings) {
		const votedCriteria = votedCriteriaByUser.get(rating.userId) ?? new Set();
		votedCriteria.add(rating.criterionId);
		votedCriteriaByUser.set(rating.userId, votedCriteria);
	}

	const allActiveUsersVoted = users.every(
		(sessionUser) =>
			(votedCriteriaByUser.get(sessionUser.userId)?.size ?? 0) >=
			criteriaList.length,
	);

	if (allActiveUsersVoted) {
		const allBeers = await db.query.sessionBeers.findMany({
			where: eq(sessionBeers.sessionId, sessionId),
			orderBy: (sb, { asc }) => asc(sb.order),
		});

		// Do nothing if all beers are already rated
		if (allBeers.every((b) => b.status === "rated")) {
			return;
		}

		const currentIndex = allBeers.findIndex(
			(b) => b.beerId === state.currentBeerId,
		);
		const currentBeer = allBeers[currentIndex];
		const nextBeer = allBeers
			.slice(currentIndex + 1)
			.find((b) => b.status === SessionBeerStatus.waiting);

		if (currentBeer) {
			await db
				.update(sessionBeers)
				.set({ status: "rated" })
				.where(eq(sessionBeers.id, currentBeer.id));
		}

		if (nextBeer) {
			await db
				.update(sessionBeers)
				.set({ status: "rating" })
				.where(eq(sessionBeers.id, nextBeer.id));
		}

		await db
			.insert(sessionState)
			.values({
				sessionId,
				currentBeerId: nextBeer?.beerId ?? null,
				currentBeerOrder: nextBeer?.order ?? null,
			})
			.onConflictDoUpdate({
				target: sessionState.sessionId,
				set: {
					currentBeerId: nextBeer?.beerId ?? null,
					currentBeerOrder: nextBeer?.order ?? null,
				},
			});
	}
};
