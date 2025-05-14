import { inArray, lt } from "drizzle-orm";

import { db } from "../config.server";
import { sessions, sessionState, sessionUsers } from "../schema.server";

import dayjs from "~/utils/dayjs";

import { SessionStatus } from "~/types/session";

const MAX_SESSION_AGE = Number(process.env.MAX_SESSION_AGE) || 12;
const MAX_SESSION_IDLE_TIME = Number(process.env.MAX_SESSION_IDLE_TIME) || 1;

/**
 * Closes sessions that are more than 12 hours old and have had no activity in the last hour.
 */
export const closeInactiveSessions = async () => {
  const sessionAgeCutoff = dayjs()
    .subtract(MAX_SESSION_AGE, "hour")
    .toISOString();
  const recentActivityCutoff = dayjs()
    .subtract(MAX_SESSION_IDLE_TIME, "hour")
    .toISOString();

  // Get all active sessions older than 12 hours
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
        s.state.lastUpdatedAt < recentActivityCutoff
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

  console.log(`Closed ${staleSessions.length} stale sessions.`);
};
