import { inArray, lt } from "drizzle-orm";

import { SessionStatus } from "~/types/session";

import dayjs from "~/utils/dayjs";

import { db } from "../config.server";
import { sessionState, sessions, sessionUsers } from "../schema.server";

const MAX_SESSION_AGE_HOURS = Number(process.env.MAX_SESSION_AGE_HOURS) || 24;
const MAX_SESSION_IDLE_TIME_HOURS =
  Number(process.env.MAX_SESSION_IDLE_TIME_HOURS) || 6;

/**
 * Closes sessions that are more than 24 hours old and have had no activity in the last 6 hours.
 */
export const closeInactiveSessions = async () => {
  const sessionAgeCutoff = dayjs()
    .subtract(MAX_SESSION_AGE_HOURS, "hour")
    .toISOString();
  const recentActivityCutoff = dayjs()
    .subtract(MAX_SESSION_IDLE_TIME_HOURS, "hour")
    .toISOString();

  // Get all active sessions older than 24 hours
  const oldActiveSessions = await db.query.sessions.findMany({
    where: lt(sessions.createdAt, sessionAgeCutoff),
    with: {
      state: true, // Just fetch the full relation
    },
  });

  const staleSessions = oldActiveSessions
    .filter(
      (s) =>
        s.state?.status === SessionStatus.active &&
        s.state.lastUpdatedAt &&
        s.state.lastUpdatedAt < recentActivityCutoff &&
        s.state.currentBeerId === null
    )
    .map((s) => s.id);

  if (staleSessions.length === 0) return;

  // Mark all stale sessions as finished
  await db
    .update(sessionState)
    .set({ status: SessionStatus.finished })
    .where(inArray(sessionState.sessionId, staleSessions));

  // Rmove all users from stale sessions
  await db
    .update(sessionUsers)
    .set({ active: false })
    .where(inArray(sessionUsers.sessionId, staleSessions));

  console.log(
    `[DB] Closed ${staleSessions.length} stale session${
      staleSessions.length !== 1 ? "s" : ""
    }.`
  );
};
