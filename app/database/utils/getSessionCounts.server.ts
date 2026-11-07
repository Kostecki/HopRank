import { and, count, eq, inArray } from "drizzle-orm";

import { SessionMode } from "~/types/session";

import { db } from "../config.server";
import {
	sessionBars,
	sessionBeers,
	sessionState,
	sessions,
	sessionUsers,
} from "../schema.server";

export type SessionCounts = {
	status: string | undefined;
	participantCount: number;
	// Beers in normal mode, bars in One Beer mode (each bar is one beer drunk).
	beerCount: number;
};

const countBySession = (rows: { sessionId: number; count: number }[]) =>
	new Map(rows.map((row) => [row.sessionId, row.count]));

/**
 * Status, active participants and beers for each session, with one query per
 * kind of count instead of several per session.
 */
export const getSessionCounts = (
	sessionIds: number[],
): Map<number, SessionCounts> => {
	if (sessionIds.length === 0) return new Map();

	const rows = db
		.select({
			id: sessions.id,
			mode: sessions.mode,
			status: sessionState.status,
		})
		.from(sessions)
		.leftJoin(sessionState, eq(sessionState.sessionId, sessions.id))
		.where(inArray(sessions.id, sessionIds))
		.all();

	const participants = countBySession(
		db
			.select({ sessionId: sessionUsers.sessionId, count: count() })
			.from(sessionUsers)
			.where(
				and(
					inArray(sessionUsers.sessionId, sessionIds),
					eq(sessionUsers.active, true),
				),
			)
			.groupBy(sessionUsers.sessionId)
			.all(),
	);

	const beerCounts = countBySession(
		db
			.select({ sessionId: sessionBeers.sessionId, count: count() })
			.from(sessionBeers)
			.where(inArray(sessionBeers.sessionId, sessionIds))
			.groupBy(sessionBeers.sessionId)
			.all(),
	);

	const barCounts = countBySession(
		db
			.select({ sessionId: sessionBars.sessionId, count: count() })
			.from(sessionBars)
			.where(inArray(sessionBars.sessionId, sessionIds))
			.groupBy(sessionBars.sessionId)
			.all(),
	);

	return new Map(
		rows.map((row) => [
			row.id,
			{
				status: row.status ?? undefined,
				participantCount: participants.get(row.id) ?? 0,
				beerCount:
					(row.mode === SessionMode.oneBeer ? barCounts : beerCounts).get(
						row.id,
					) ?? 0,
			},
		]),
	);
};
