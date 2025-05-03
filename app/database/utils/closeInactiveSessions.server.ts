import { and, eq, inArray, lt } from "drizzle-orm";

import { db } from "../config.server";
import { sessions, sessionState } from "../schema.server";

import { SessionStatus } from "~/types/session";

const MAX_SESSION_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours
const RECENT_ACTIVITY_WINDOW_MS = 1 * 60 * 60 * 1000; // 1 hour

/**
 * Closes sessions that are more than 12 hours old and have had no activity in the last hour.
 */
export const closeInactiveSessions = async () => {
  const now = Date.now();
  const sessionAgeCutoff = new Date(now - MAX_SESSION_AGE_MS).toISOString();
  const recentActivityCutoff = new Date(
    now - RECENT_ACTIVITY_WINDOW_MS
  ).toISOString();

  // Get all active sessions older than 12 hours
  const oldActiveSessions = await db.query.sessions.findMany({
    where: lt(sessions.createdAt, sessionAgeCutoff),
    with: {
      state: {
        where: and(
          eq(sessionState.status, SessionStatus.active),
          lt(sessionState.lastUpdatedAt, recentActivityCutoff)
        ),
      },
    },
  });

  const staleSessions = oldActiveSessions
    .filter((s) => s.state)
    .map((s) => s.id);

  if (staleSessions.length === 0) return;

  await db
    .update(sessionState)
    .set({ status: SessionStatus.finished })
    .where(inArray(sessionState.sessionId, staleSessions));

  console.log(`Closed ${staleSessions.length} stale sessions.`);
};
