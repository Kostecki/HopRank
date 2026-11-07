import { and, desc, eq, ne } from "drizzle-orm";

import { SessionBeerStatus } from "~/types/session";

import { type BeerRow, scoreBeerOrder, shuffle } from "~/utils/shuffle";

import { db, type Executor } from "../config.server";
import { beers, sessionBeers } from "../schema.server";

/**
 * Shuffles the beers in a session to create a randomized, yet thoughtfully ordered sequence.
 * The shuffle algorithm aims to avoid placing beers from the same brewery, style, or added by the same user consecutively.
 *
 * Always (re)assigns order to every currently-waiting beer, including a lone
 * one, so a single newly-added beer still gets positioned relative to the
 * rest of the waiting queue rather than being left with no order.
 *
 * @param sessionId - The ID of the session whose beers should be shuffled.
 */
export const shuffleBeersInSession = (
	sessionId: number,
	executor: Executor = db,
) => {
	const rows = executor
		.select({
			sessionBeer: sessionBeers,
			beer: beers,
		})
		.from(sessionBeers)
		.innerJoin(beers, eq(sessionBeers.beerId, beers.id))
		.where(
			and(
				eq(sessionBeers.sessionId, sessionId),
				eq(sessionBeers.status, SessionBeerStatus.waiting),
			),
		)
		.all();

	if (rows.length === 0) return;

	const complete: BeerRow[] = rows.map(({ sessionBeer, beer }) => ({
		id: sessionBeer.id,
		beerId: beer.id,
		addedByUserId: sessionBeer.addedByUserId,
		breweryName: beer.breweryName,
		style: beer.style,
		order: sessionBeer.order,
	}));

	// Seed from an already-shuffled arrangement, not the raw query order: rows
	// come back with no `ORDER BY` (effectively DB-insertion order), so if no
	// shuffle ever strictly beats the starting score (e.g. exactly 2 waiting
	// beers, where any order scores identically), a newly-added beer would
	// otherwise always settle back into that natural, append-like order.
	let best: BeerRow[] = shuffle(complete);
	let bestScore = scoreBeerOrder(best);

	for (let i = 0; i < 200; i++) {
		const shuffled = shuffle(complete);
		const score = scoreBeerOrder(shuffled);

		if (score > bestScore) {
			best = shuffled;
			bestScore = score;

			const maxScore = (complete.length - 1) * 3;
			if (score === maxScore) break;
		}
	}

	const maxOrderRow = executor
		.select({ order: sessionBeers.order })
		.from(sessionBeers)
		.where(
			and(
				eq(sessionBeers.sessionId, sessionId),
				ne(sessionBeers.status, SessionBeerStatus.waiting),
			),
		)
		.orderBy(desc(sessionBeers.order))
		.limit(1)
		.get();
	const baseOrder = maxOrderRow?.order ?? -1;

	for (const [index, beer] of best.entries()) {
		executor
			.update(sessionBeers)
			.set({ order: baseOrder + index + 1 })
			.where(eq(sessionBeers.id, beer.id))
			.run();
	}
};
