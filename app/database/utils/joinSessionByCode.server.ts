import { and, eq } from "drizzle-orm";

import { SessionStatus } from "~/types/session";

import { emitGlobalEvent, emitSessionEvent } from "~/utils/websocket.server";

import { db } from "../config.server";
import { sessions, sessionUsers } from "../schema.server";
import { joinSessionById } from "./joinSessionById.server";

export class SessionNotFoundError extends Error {}
export class SessionStateNotFoundError extends Error {}

export type JoinSessionResult = {
  session: { id: number; name: string; status: string };
  readOnly: boolean;
  alreadyJoined: boolean;
};

export async function joinSessionByCode({
  joinCode,
  userId,
}: {
  joinCode: string;
  userId: number;
}): Promise<JoinSessionResult> {
  const code = joinCode.trim().toUpperCase();

  console.log(
    `Attempting to join session with code: ${code} for user ID: ${userId}`
  );
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.joinCode, code),
    with: {
      state: true,
    },
  });

  if (!session) {
    throw new SessionNotFoundError(
      "Session not found for the provided join code"
    );
  }

  const state = session.state;
  if (!state) {
    throw new SessionStateNotFoundError(
      `Status for session id "${session.id}" not found`
    );
  }

  const isFinished = state.status === SessionStatus.finished;
  console.log(`Session status is finished: ${isFinished}`);

  const existing = await db.query.sessionUsers.findFirst({
    where: and(
      eq(sessionUsers.sessionId, session.id),
      eq(sessionUsers.userId, userId),
      eq(sessionUsers.active, true)
    ),
  });
  console.log(`Existing user in session: ${!!existing}`);

  const alreadyJoined = !!existing;
  console.log(`User already joined: ${alreadyJoined}`);

  if (!alreadyJoined && !isFinished) {
    console.log(`User is joining session ID: ${session.id}`);
    await joinSessionById({ sessionId: session.id, userId });

    // Emit events only when a user newly joins and session isn't finished
    console.log(
      `Emitting session and global events for session ID: ${session.id}`
    );
    emitSessionEvent(session.id, "session:users-changed");
    emitGlobalEvent("sessions:users-changed", { sessionId: session.id });
  }

  console.log(
    `Join session by code result: session ID ${session.id}, readOnly: ${isFinished}, alreadyJoined: ${alreadyJoined}`
  );
  return {
    session: { id: session.id, name: session.name, status: state.status },
    readOnly: isFinished,
    alreadyJoined,
  };
}
