import { eq } from "drizzle-orm";

import type { BeerInput } from "~/schemas/beer";

import { db } from "../config.server";
import { beers } from "../schema.server";

/** Returns the id of the beer, creating it the first time it's seen. */
export const upsertBeer = async (beer: BeerInput) => {
	const existingBeer = await db.query.beers.findFirst({
		where: eq(beers.untappdBeerId, beer.untappdBeerId),
	});

	if (existingBeer) return existingBeer.id;

	const { untappdBeerId, name, breweryName, abv, style, label, label_hd } =
		beer;

	const [newBeer] = await db
		.insert(beers)
		.values({
			untappdBeerId,
			name,
			breweryName,
			abv,
			style,
			label,
			label_hd,
		})
		.returning();

	return newBeer.id;
};
