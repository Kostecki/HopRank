import { z } from "zod";

const text = z.string().trim().min(1);

/** A beer picked from Untappd search, as the client sends it. */
export const beerInputSchema = z.object({
	// Search results carry the id as a string.
	untappdBeerId: z.coerce.number().int().positive(),
	name: text,
	breweryName: text,
	abv: z.number().min(0).max(100),
	style: text,
	label: text,
	label_hd: z.string().optional(),
});

export type BeerInput = z.infer<typeof beerInputSchema>;
