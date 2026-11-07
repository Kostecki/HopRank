import { z } from "zod";

import type { Checkin } from "~/types/untappd";

const coordinate = (limit: number) => z.coerce.number().min(-limit).max(limit);

/** A check-in from the vote form, turned into Untappd's form fields. */
export const checkinSchema = z
	.object({
		bid: z.coerce.number().int().positive(),
		geolat: coordinate(90),
		geolng: coordinate(180),
		foursquare_id: z.string().default(""),
		// Untappd's own limit.
		shout: z
			.string()
			.max(140, "Kommentaren må højst være 140 tegn")
			.default(""),
		rating: z.coerce.number().min(0).max(5).optional(),
		timezone: z.string().min(1).default("Europe/Copenhagen"),
		gmt_offset: z.coerce.number().min(-12).max(14),
	})
	.transform(
		(checkin): Checkin => ({
			bid: String(checkin.bid),
			geolat: String(checkin.geolat),
			geolng: String(checkin.geolng),
			foursquare_id: checkin.foursquare_id,
			shout: checkin.shout,
			rating: checkin.rating === undefined ? "" : String(checkin.rating),
			timezone: checkin.timezone,
			gmt_offset: String(checkin.gmt_offset),
		}),
	);
