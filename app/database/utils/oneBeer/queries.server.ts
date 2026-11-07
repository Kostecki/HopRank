import { and, asc, eq } from "drizzle-orm";

import type {
	OneBeerRanking,
	SessionBar,
	SessionBarList,
} from "~/types/oneBeer";
import { SessionBeerStatus } from "~/types/session";

import {
	getBarStats,
	getPersonalPlacements,
	rankBars,
} from "~/utils/oneBeerRanking";

import { db } from "../../config.server";
import {
	barPlacements,
	beers,
	sessionBars,
	sessions,
	sessionUsers,
} from "../../schema.server";
import type { SelectSessionBars } from "../../schema.types";

const toSessionBar = (
	bar: SelectSessionBars,
	placementCount: number,
	stopNumber: number,
): SessionBar => ({
	id: bar.id,
	name: bar.name,
	foursquareId: bar.foursquareId,
	address: bar.address,
	city: bar.city,
	category: bar.category,
	lat: bar.lat,
	lng: bar.lng,
	stopNumber,
	addedByUserId: bar.addedByUserId,
	status: bar.status,
	placementCount,
});

/** Every bar in the session, in queue order. */
export async function getSessionBars(sessionId: number): Promise<SessionBar[]> {
	const [bars, placements] = await Promise.all([
		db.query.sessionBars.findMany({
			where: eq(sessionBars.sessionId, sessionId),
			orderBy: asc(sessionBars.order),
		}),
		db.query.barPlacements.findMany({
			where: eq(barPlacements.sessionId, sessionId),
			columns: { barId: true },
		}),
	]);

	return bars.map((bar, index) =>
		toSessionBar(
			bar,
			placements.filter((p) => p.barId === bar.id).length,
			index + 1,
		),
	);
}

/** The group's view of the session: its ranking, open bar and queue. */
export async function getOneBeerRanking(
	sessionId: number,
): Promise<OneBeerRanking> {
	const session = await db.query.sessions.findFirst({
		where: eq(sessions.id, sessionId),
		columns: { beerId: true },
	});
	const [beer, bars, placements, activeUsers] = await Promise.all([
		session?.beerId
			? db.query.beers.findFirst({ where: eq(beers.id, session.beerId) })
			: undefined,
		getSessionBars(sessionId),
		db.query.barPlacements.findMany({
			where: eq(barPlacements.sessionId, sessionId),
		}),
		db.query.sessionUsers.findMany({
			where: and(
				eq(sessionUsers.sessionId, sessionId),
				eq(sessionUsers.active, true),
			),
			columns: { userId: true },
		}),
	]);

	const finishedBars = bars.filter(
		(bar) => bar.status === SessionBeerStatus.rated,
	);
	const finishedBarIds = finishedBars.map((bar) => bar.id);
	const stats = getBarStats(finishedBarIds, placements);
	const rankedBars = rankBars(finishedBarIds, placements).flatMap(
		({ barId, averagePosition }) => {
			const bar = finishedBars.find((b) => b.id === barId);
			return bar
				? [
						{
							...bar,
							averagePosition,
							placedByCount: 0,
							firstPlaceCount: 0,
							bestPosition: 0,
							worstPosition: 0,
							...stats.get(barId),
						},
					]
				: [];
		},
	);

	const current = bars.find((bar) => bar.status === SessionBeerStatus.rating);
	const activeUserIds = new Set(activeUsers.map((u) => u.userId));

	return {
		beer: beer ?? null,
		rankedBars,
		currentBar: current
			? {
					...current,
					placedCount: placements.filter(
						(p) => p.barId === current.id && activeUserIds.has(p.userId),
					).length,
					expectedCount: activeUsers.length,
				}
			: null,
		queuedBars: bars.filter((bar) => bar.status === SessionBeerStatus.waiting),
		personalPlacements: getPersonalPlacements(finishedBarIds, placements),
	};
}

/**
 * One person's own list, best bar first. An open bar they haven't placed yet
 * goes at the bottom.
 */
export async function getPersonalBarList(
	sessionId: number,
	userId: number,
): Promise<SessionBarList> {
	const [bars, placements] = await Promise.all([
		getSessionBars(sessionId),
		db.query.barPlacements.findMany({
			where: and(
				eq(barPlacements.sessionId, sessionId),
				eq(barPlacements.userId, userId),
			),
			orderBy: asc(barPlacements.position),
		}),
	]);

	const placed = placements.flatMap(({ barId }) => {
		const bar = bars.find((b) => b.id === barId);
		return bar ? [bar] : [];
	});

	const current = bars.find((bar) => bar.status === SessionBeerStatus.rating);
	const hasPlacedCurrent =
		!!current && placed.some((bar) => bar.id === current.id);

	return {
		bars: current && !hasPlacedCurrent ? [...placed, current] : placed,
		hasPlacedCurrent,
	};
}
