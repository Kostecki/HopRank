import type { VenueDetails } from "~/types/oneBeer";

const normalizeBarName = (name: string) => name.trim().toLocaleLowerCase("da");

type BarIdentity = { name: string; foursquareId: string | null };

/**
 * The bar already on the list that a new one would duplicate: the same venue, or
 * the same name ignoring case and spaces. `ignoreBarId` leaves one bar out, for
 * when that bar is the one being changed.
 */
export function findDuplicateBar<T extends BarIdentity & { id: number }>(
	bars: T[],
	input: BarIdentity,
	ignoreBarId?: number,
) {
	return bars.find(
		(bar) =>
			bar.id !== ignoreBarId &&
			((input.foursquareId && bar.foursquareId === input.foursquareId) ||
				normalizeBarName(bar.name) === normalizeBarName(input.name)),
	);
}

type BarLocation = Pick<VenueDetails, "address" | "city" | "lat" | "lng">;

export const formatBarAddress = ({ address, city }: BarLocation) =>
	[address, city].filter(Boolean).join(", ");

/** A link that opens in whichever maps app the device uses for Google Maps links. */
export function getBarMapUrl(bar: BarLocation) {
	const query =
		bar.lat !== null && bar.lng !== null
			? `${bar.lat},${bar.lng}`
			: formatBarAddress(bar);

	return query
		? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
		: null;
}

type Placement = {
	barId: number;
	userId: number;
	position: number;
};

export type BarAverage = {
	barId: number;
	averagePosition: number;
};

export type BarStats = {
	placedByCount: number;
	firstPlaceCount: number;
	bestPosition: number;
	worstPosition: number;
};

/** Each person's list of finished bars, best bar first. */
const getFinishedLists = (
	finishedBarIds: number[],
	placements: Placement[],
) => {
	const finished = new Set(finishedBarIds);

	const listsByUser = new Map<number, Placement[]>();
	for (const placement of placements) {
		if (!finished.has(placement.barId)) continue;
		const list = listsByUser.get(placement.userId) ?? [];
		list.push(placement);
		listsByUser.set(placement.userId, list);
	}

	return [...listsByUser.values()].map((list) =>
		[...list].sort((a, b) => a.position - b.position),
	);
};

/**
 * Turns everyone's personal lists into one group ranking, best bar first.
 *
 * A plain average of positions is unfair when lists differ in length: third of
 * 3 isn't third of 10, and late joiners only rank later bars. So each position
 * is converted to its relative place in that person's list, averaged per bar,
 * and scaled back to the size of the full list. When everyone ranked every
 * bar, this equals the plain average position.
 *
 * Only finished bars count, and each list is renumbered without the others, so
 * a bar that is still open can't affect the results.
 */
export function rankBars(
	finishedBarIds: number[],
	placements: Placement[],
): BarAverage[] {
	const totalBars = finishedBarIds.length;

	const relativePlaces = new Map<number, number[]>();
	for (const list of getFinishedLists(finishedBarIds, placements)) {
		list.forEach(({ barId }, index) => {
			const places = relativePlaces.get(barId) ?? [];
			places.push((index + 0.5) / list.length);
			relativePlaces.set(barId, places);
		});
	}

	return finishedBarIds
		.map((barId) => {
			const places = relativePlaces.get(barId);
			if (!places) return { barId, averagePosition: totalBars };

			const average = places.reduce((sum, p) => sum + p, 0) / places.length;
			return { barId, averagePosition: average * totalBars + 0.5 };
		})
		.sort((a, b) => a.averagePosition - b.averagePosition);
}

/**
 * Where each person placed the finished bars, numbered among those bars only.
 * Keyed by bar id, so a bar someone didn't place is simply missing.
 */
export function getPersonalPlacements(
	finishedBarIds: number[],
	placements: Placement[],
) {
	return (
		getFinishedLists(finishedBarIds, placements)
			.map((list) => ({
				userId: list[0].userId,
				positions: Object.fromEntries(
					list.map(({ barId }, index) => [barId, index + 1]),
				) as Record<number, number>,
			}))
			// A stable order: rows come back in whichever order people last saved.
			.sort((a, b) => a.userId - b.userId)
	);
}

/** Group totals per bar: first places and the range of placements. */
export function getBarStats(
	finishedBarIds: number[],
	placements: Placement[],
): Map<number, BarStats> {
	const stats = new Map<number, BarStats>();

	for (const list of getFinishedLists(finishedBarIds, placements)) {
		list.forEach(({ barId }, index) => {
			const position = index + 1;
			const current = stats.get(barId);

			stats.set(barId, {
				placedByCount: (current?.placedByCount ?? 0) + 1,
				firstPlaceCount:
					(current?.firstPlaceCount ?? 0) + (position === 1 ? 1 : 0),
				bestPosition: Math.min(current?.bestPosition ?? position, position),
				worstPosition: Math.max(current?.worstPosition ?? position, position),
			});
		});
	}

	return stats;
}

/**
 * The bars the group agreed and disagreed on most, measured by how far apart
 * their best and worst placements are. Null when there's no real difference
 * to point at, such as when every bar has the same spread.
 */
export function findAgreement<T extends BarStats>(bars: T[]) {
	const spread = (bar: T) => bar.worstPosition - bar.bestPosition;
	const comparable = bars.filter((bar) => bar.placedByCount >= 2);

	if (comparable.length < 2) return null;

	const mostAgreed = comparable.reduce((a, b) =>
		spread(b) < spread(a) ? b : a,
	);
	const mostDisagreed = comparable.reduce((a, b) =>
		spread(b) > spread(a) ? b : a,
	);

	return spread(mostAgreed) < spread(mostDisagreed)
		? { mostAgreed, mostDisagreed }
		: null;
}

/**
 * The line between the new bar's waiting area and the ranking, kept in the same
 * list as the bars. It goes away once the new bar is picked up.
 */
export const RANKING_START = -1;

/** The new bar in the waiting area, above everything already ranked. */
export function withWaitingArea(order: number[], newBarId: number) {
	return [
		newBarId,
		RANKING_START,
		...order.filter((id) => id !== newBarId && id !== RANKING_START),
	];
}

/** Only the new bar may be above the line: ranked bars can't leave the list. */
export function isValidArrangement(order: number[], newBarId: number | null) {
	const start = order.indexOf(RANKING_START);

	return start === -1 || order.slice(0, start).every((id) => id === newBarId);
}

/** The ranking as it would be saved, leaving out a bar still waiting above. */
export function getRankedBarIds(order: number[]) {
	return order.slice(order.indexOf(RANKING_START) + 1);
}

/** The number for each row. Rows above and at the line have none. */
export function getRowPlacements(order: number[]) {
	const start = order.indexOf(RANKING_START);

	return order.map((_, index) => (index > start ? index - start : null));
}

/**
 * Keeps the order someone is working on while refreshes arrive: bars that no
 * longer exist are dropped, and bars that are new to them go at the bottom.
 */
export function mergeBarOrder(localOrder: number[], serverOrder: number[]) {
	const server = new Set(serverOrder);
	const local = new Set(localOrder);

	return [
		...localOrder.filter((barId) => server.has(barId)),
		...serverOrder.filter((barId) => !local.has(barId)),
	];
}
