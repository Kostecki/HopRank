import { redirect, useLoaderData } from "react-router";
import { inArray } from "drizzle-orm";
import { Paper, Tabs, Text } from "@mantine/core";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { sessionsTable, usersTable } from "~/database/schema.server";
import {
  getSessions,
  getSessionLastActivity,
  getBeersCountPerSession,
} from "~/database/helpers";

import NewSession from "~/components/NewSession";
import SessionsTable from "~/components/SessionsTable";

import { getPageTitle } from "~/utils/utils";

import type { Route } from "./+types";

// Timeout rules
const SESSION_MIN_AGE_HOURS = 6;
const SESSION_INACTIVITY_TIMEOUT_HOURS = 6;

export function meta({}: Route.MetaArgs) {
  return [{ title: getPageTitle("Smagninger") }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  if (user.activeSession) {
    return redirect("/sessions/" + user.activeSession);
  }

  // Fetch data from database
  const allSessions = await getSessions();
  const activityMap = await getSessionLastActivity();
  const beersCountMap = await getBeersCountPerSession();

  const now = new Date();
  const staleSessionIds: number[] = [];

  const sessions = allSessions.map((session) => {
    const lastActivity = activityMap.get(session.id);
    const fallbackActivityTime = lastActivity || new Date(session.createdAt);

    const createdAgoHours =
      (now.getTime() - new Date(session.createdAt).getTime()) / 1000 / 60 / 60;
    const lastActivityAgoHours =
      (now.getTime() - new Date(fallbackActivityTime).getTime()) /
      1000 /
      60 /
      60;

    const isStale =
      createdAgoHours >= SESSION_MIN_AGE_HOURS &&
      lastActivityAgoHours >= SESSION_INACTIVITY_TIMEOUT_HOURS;

    if (isStale && session.active) {
      staleSessionIds.push(session.id);
    }

    return {
      ...session,
      beersCount: beersCountMap.get(session.id) || 0,
    };
  });

  if (staleSessionIds.length > 0) {
    // Close session
    await db
      .update(sessionsTable)
      .set({ active: false })
      .where(inArray(sessionsTable.id, staleSessionIds));

    // Remove closed session from users active session
    await db
      .update(usersTable)
      .set({ activeSessionId: null })
      .where(inArray(usersTable.activeSessionId, staleSessionIds));
  }

  const staleSessionIdSet = new Set(staleSessionIds);
  const sessionsWithStatus = sessions.map((session) => ({
    ...session,
    status:
      !session.active || staleSessionIdSet.has(session.id)
        ? "inactive"
        : "active",
  }));

  return { sessions: sessionsWithStatus };
}

export default function Sessions() {
  const { sessions } = useLoaderData<typeof loader>();

  const activeSessions = sessions
    .filter((session) => session.status === "active")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const inactiveSessions = sessions
    .filter((session) => session.status === "inactive")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <Paper p="md" radius="md" withBorder>
      <Tabs defaultValue="active" color="slateIndigo">
        <Tabs.List mb="sm" grow justify="center">
          <Tabs.Tab value="active" fw="bold">
            Aktive
          </Tabs.Tab>
          <Tabs.Tab value="past" fw="bold">
            Afsluttede
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="active">
          <Text c="dimmed" size="sm" fs="italic">
            Vælg en smagning for at deltage
          </Text>

          <SessionsTable sessions={activeSessions} mode="active" />
        </Tabs.Panel>

        <Tabs.Panel value="past">
          <Text c="dimmed" size="sm" fs="italic">
            Se tidligere smagninger
          </Text>

          <SessionsTable sessions={inactiveSessions} mode="inactive" />
        </Tabs.Panel>
      </Tabs>

      <NewSession mt={30} />
    </Paper>
  );
}
