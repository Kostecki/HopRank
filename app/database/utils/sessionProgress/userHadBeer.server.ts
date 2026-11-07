import { getBeerInfo } from "~/utils/untappd";

// Whether a user has had a beer, per Untappd. Keyed by user and beer, since
// Untappd's user_count is relative to whoever's token made the request.
// Module-level, single-process cache.
const HAD_BEER_TTL_MS = 60 * 60 * 1000;
const HAD_BEER_MAX_ENTRIES = 5_000;
const hadBeerCache = new Map<string, { hadBeer: boolean; expiresAt: number }>();

/** Whether the user has checked in the beer on Untappd, cached for an hour. */
export async function getUserHadBeer(
	userId: number,
	untappdBeerId: number,
	accessToken: string,
) {
	const key = `${userId}:${untappdBeerId}`;
	const now = Date.now();

	const cached = hadBeerCache.get(key);
	if (cached && cached.expiresAt > now) {
		return cached.hadBeer;
	}

	const beerInfo = await getBeerInfo(untappdBeerId, accessToken);
	if (!beerInfo) {
		// Don't cache failures: the next request retries.
		return false;
	}

	const hadBeer = beerInfo.stats?.user_count > 0;

	if (hadBeerCache.size >= HAD_BEER_MAX_ENTRIES) {
		// Maps iterate in insertion order, so this drops the oldest entry.
		const oldest = hadBeerCache.keys().next().value;
		if (oldest !== undefined) hadBeerCache.delete(oldest);
	}
	hadBeerCache.delete(key);
	hadBeerCache.set(key, { hadBeer, expiresAt: now + HAD_BEER_TTL_MS });

	return hadBeer;
}
