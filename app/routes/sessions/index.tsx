import { Paper } from "@mantine/core";
import { and, eq } from "drizzle-orm";
import { useMemo } from "react";
import { redirect, useLoaderData, useRevalidator } from "react-router";

import { SessionStatus } from "~/types/session";
import type { SocketEvent } from "~/types/websocket";
import type { Route } from "./+types";

import { userSessionGet } from "~/auth/users.server";
import { ModalSetName } from "~/components/modals/ModalSetName";
import NewSession from "~/components/NewSession";
import SessionPinInput from "~/components/SessionPinInput";
import { SessionTabs } from "~/components/SessionTabs";
import { db } from "~/database/config.server";
import { criteria, sessions, sessionUsers } from "~/database/schema.server";
import { getSessionCounts } from "~/database/utils/getSessionCounts.server";
import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";
import { getPageTitle } from "~/utils/utils";

export function meta() {
  return [{ title: getPageTitle("Smagninger") }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);
  if (!user) {
    return redirect("/auth/login");
  }

  // Check if the user is already in an active session and redirect
  const currentUserSession = await db.query.sessionUsers.findFirst({
    where: and(eq(sessionUsers.userId, user.id), eq(sessionUsers.active, true)),
  });
  if (currentUserSession) {
    const sessionId = currentUserSession.sessionId;
    return redirect(`/sessions/${sessionId}`);
  }

  const allCriteria = await db
    .select()
    .from(criteria)
    .where(eq(criteria.enabled, true));

  const createdSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.createdBy, user.id));

  const joined = await db
    .select()
    .from(sessionUsers)
    .innerJoin(sessions, eq(sessionUsers.sessionId, sessions.id))
    .where(eq(sessionUsers.userId, user.id));

  const sessionMap = new Map<number, typeof sessions.$inferSelect>();
  for (const s of [...createdSessions, ...joined.map((j) => j.sessions)]) {
    sessionMap.set(s.id, s);
  }
  const allSessions = Array.from(sessionMap.values());

  const sessionSummaries = await Promise.all(
    allSessions.map(async (session) => {
      const { state, participantCount, beerCount } = await getSessionCounts(
        session.id
      );

      return {
        id: session.id,
        name: session.name,
        joinCode: session.joinCode,
        participants: participantCount,
        beers: beerCount,
        status: state?.status,
        createdAt: session.createdAt,
        createdBy: session.createdBy,
      };
    })
  );

  return {
    criteria: allCriteria,
    sessionSummaries,
    user,
  };
}

export default function Sessions() {
  const { criteria, sessionSummaries, user } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  // Get active session IDs for the user to filter socket events
  const activeUserSessionIds = sessionSummaries
    .filter(
      (s) =>
        s.status === SessionStatus.active || s.status === SessionStatus.created
    )
    .map((s) => s.id);

  const socketEvents = useMemo<SocketEvent[]>(
    () => [
      "sessions:created",
      "sessions:deleted",
      "sessions:users-changed",
      "sessions:beer-changed",
    ],
    []
  );

  useDebouncedSocketEvent(socketEvents, (payload?: { sessionId: number }) => {
    // Revalidate if event is global or if the sessionId is in the active sessions
    if (!payload || activeUserSessionIds.includes(payload.sessionId)) {
      revalidate();
    }
  });

  const inProgressSessions = sessionSummaries.filter(
    (s) =>
      s.status === SessionStatus.active || s.status === SessionStatus.created
  );
  const finishedSessions = sessionSummaries.filter(
    (s) => s.status === SessionStatus.finished
  );

  return (
    <>
      <Paper p="md" radius="md" withBorder>
        <SessionPinInput mt="md" mb={50} />

        <SessionTabs
          inProgressSessions={inProgressSessions}
          finishedSessions={finishedSessions}
          readOnly={false}
        />

        <NewSession criteria={criteria} />
      </Paper>

      <ModalSetName user={user} />
    </>
  );
}
