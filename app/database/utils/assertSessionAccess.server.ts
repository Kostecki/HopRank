import { and, eq } from "drizzle-orm";
import { data } from "react-router";

import type { SessionUser } from "~/types/user";

import { db } from "../config.server";
import { sessionUsers } from "../schema.server";
import type { SelectSessions } from "../schema.types";

const forbidden = (message: string) => data({ message }, { status: 403 });

export async function isActiveSessionParticipant(
  sessionId: number,
  userId: number
) {
  const membership = await db.query.sessionUsers.findFirst({
    where: and(
      eq(sessionUsers.sessionId, sessionId),
      eq(sessionUsers.userId, userId),
      eq(sessionUsers.active, true)
    ),
  });

  return !!membership;
}

/** Throws a 403 unless the user is a currently-active participant in the session. */
export async function requireSessionParticipant(
  sessionId: number,
  userId: number
) {
  if (!(await isActiveSessionParticipant(sessionId, userId))) {
    throw forbidden("Du er ikke en del af denne smagning");
  }
}

/** Throws a 403 unless the user created the session or is an admin. */
export function requireSessionOwnerOrAdmin(
  session: Pick<SelectSessions, "createdBy">,
  user: Pick<SessionUser, "id" | "admin">
) {
  if (session.createdBy !== user.id && !user.admin) {
    throw forbidden("Kun ejeren af smagningen kan udføre denne handling");
  }
}

/**
 * Throws a 403 unless the user created the session or has ever had a
 * session_users row for it (active or not). Used to gate rejoining a
 * session by id, as opposed to a first-time join via join code.
 */
export async function requireSessionRejoinEligible(
  session: Pick<SelectSessions, "createdBy">,
  userId: number,
  sessionId: number
) {
  if (session.createdBy === userId) return;

  const membership = await db.query.sessionUsers.findFirst({
    where: and(
      eq(sessionUsers.sessionId, sessionId),
      eq(sessionUsers.userId, userId)
    ),
  });

  if (!membership) {
    throw forbidden("Du er ikke en del af denne smagning");
  }
}
