import { data } from "react-router";
import { z } from "zod";

import type { Route } from "./+types/venues";

import { requireUser } from "~/auth/requireUser.server";
import { getVenues } from "~/utils/untappd";
import { parseOrThrow } from "~/utils/validation.server";

const venueQuerySchema = z.object({
	lat: z.coerce.number().min(-90).max(90),
	lng: z.coerce.number().min(-180).max(180),
	q: z.string().trim().max(100).optional(),
});

/**
 * Venues near a location, searched on Untappd with the user's own token, so
 * the token stays on the server.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const user = await requireUser(request);
	if (!user.untappd) {
		throw data(
			{ message: "Du skal være logget ind med Untappd" },
			{ status: 401 },
		);
	}

	const url = new URL(request.url);
	const { lat, lng, q } = parseOrThrow(venueQuerySchema, {
		lat: url.searchParams.get("lat") ?? undefined,
		lng: url.searchParams.get("lng") ?? undefined,
		q: url.searchParams.get("q") || undefined,
	});

	return getVenues(user.untappd.accessToken, lat, lng, q);
}
