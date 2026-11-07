import { eq } from "drizzle-orm";

import type { BeerInput } from "~/schemas/beer";

import { db, type Executor } from "../config.server";
import { beers } from "../schema.server";

/**
 * Returns the id of the beer, creating it the first time it's seen. A beer
 * that's already stored is kept as it is.
 */
export const upsertBeer = (beer: BeerInput, executor: Executor = db) => {
	const { untappdBeerId, name, breweryName, abv, style, label, label_hd } =
		beer;

	// Insert-or-ignore, then read: a concurrent insert of the same beer can't
	// fail the request on the unique untappd_beer_id.
	const inserted = executor
		.insert(beers)
		.values({ untappdBeerId, name, breweryName, abv, style, label, label_hd })
		.onConflictDoNothing({ target: beers.untappdBeerId })
		.returning({ id: beers.id })
		.get();
	if (inserted) return inserted.id;

	const existing = executor
		.select({ id: beers.id })
		.from(beers)
		.where(eq(beers.untappdBeerId, untappdBeerId))
		.get();
	if (!existing) {
		throw new Error(`Beer ${untappdBeerId} missing after insert conflict`);
	}

	return existing.id;
};
