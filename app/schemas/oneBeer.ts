import { z } from "zod";

// Shape only. oneBeer.server.ts's cleanBarInput and cleanVenueDetails trim the
// values and enforce their lengths and ranges.
const optionalText = z.string().nullish();
const optionalNumber = z.number().nullish();

export const barSelectionSchema = z.object({
	name: z.string({ message: "Baren skal have et navn" }),
	foursquareId: z
		.string()
		.nullish()
		.transform((id) => id || null),
	address: optionalText,
	city: optionalText,
	category: optionalText,
	lat: optionalNumber,
	lng: optionalNumber,
});

// syncVenueDetails only looks at the first 100.
export const venueListSchema = z.array(barSelectionSchema);
