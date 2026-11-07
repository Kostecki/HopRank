import { and, eq, inArray, lt } from "drizzle-orm";

import { SessionStatus } from "~/types/session";

import dayjs from "~/utils/dayjs";
import { env } from "~/utils/env.server";

import { db } from "../config.server";
import { sessionState, sessions } from "../schema.server";
import { finishSessions } from "./finishSessions.server";

const { MAX_SESSION_AGE_HOURS, MAX_SESSION_IDLE_TIME_HOURS } = env;

// Same format as SQLite's CURRENT_TIMESTAMP (UTC), because the timestamps are
// compared as strings. With an ISO cutoff, a value on the cutoff's date always
// sorts as older, since the space in "YYYY-MM-DD HH:MM:SS" sorts before "T".
const hoursAgoAsSqliteTimestamp = (hours: number) =>
	dayjs().subtract(hours, "hour").toISOString().slice(0, 19).replace("T", " ");

/**
 * Closes unfinished sessions older than MAX_SESSION_AGE_HOURS (default 24) with
 * no activity in the last MAX_SESSION_IDLE_TIME_HOURS (default 6), whether or
 * not a beer is still being rated or the session was ever started.
 */
export const closeInactiveSessions = async () => {
	const sessionAgeCutoff = hoursAgoAsSqliteTimestamp(MAX_SESSION_AGE_HOURS);
	const recentActivityCutoff = hoursAgoAsSqliteTimestamp(
		MAX_SESSION_IDLE_TIME_HOURS,
	);

	const staleSessions = db
		.select({ id: sessions.id })
		.from(sessions)
		.innerJoin(sessionState, eq(sessionState.sessionId, sessions.id))
		.where(
			and(
				lt(sessions.createdAt, sessionAgeCutoff),
				lt(sessionState.lastUpdatedAt, recentActivityCutoff),
				inArray(sessionState.status, [
					SessionStatus.active,
					SessionStatus.created,
				]),
			),
		)
		.all()
		.map((s) => s.id);

	if (staleSessions.length === 0) return;

	finishSessions(staleSessions);

	console.log(
		`[DB] Closed ${staleSessions.length} stale session${
			staleSessions.length !== 1 ? "s" : ""
		}.`,
	);
};
