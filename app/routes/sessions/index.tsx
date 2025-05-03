import { redirect, useLoaderData } from "react-router";
import { count, eq } from "drizzle-orm";
import { Paper, Tabs, Text } from "@mantine/core";

import NewSession from "~/components/NewSession";
import SessionsTable from "~/components/SessionsTable";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import {
  criteria,
  sessionBeers,
  sessions,
  sessionState,
  sessionUsers,
} from "~/database/schema.server";

import { getPageTitle } from "~/utils/utils";

import type { Route } from "./+types";
import { SessionStatus } from "~/types/session";

export function meta({}: Route.MetaArgs) {
  return [{ title: getPageTitle("Smagninger") }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);
  if (!user) {
    return redirect("/auth/login");
  }

  const allCriteria = await db.select().from(criteria);

  const allSessions = await db.select().from(sessions);
  const sessionSummaries = await Promise.all(
    allSessions.map(async (session) => {
      const [sessionBase, sessionDetails, userCountResult, beerCountResult] =
        await Promise.all([
          db.query.sessions.findFirst({
            where: eq(sessions.id, session.id),
          }),
          db.query.sessionState.findFirst({
            where: eq(sessionState.sessionId, session.id),
          }),
          db
            .select({ count: count() })
            .from(sessionUsers)
            .where(eq(sessionUsers.sessionId, session.id)),
          db
            .select({ count: count() })
            .from(sessionBeers)
            .where(eq(sessionBeers.sessionId, session.id)),
        ]);

      console.log("sessionBase", sessionBase);
      console.log("sessionDetails", sessionDetails);
      console.log("userCountResult", userCountResult);
      console.log("beerCountResult", beerCountResult);

      return {
        id: session.id,
        name: session.name,
        participants: userCountResult[0].count ?? 0,
        beers: beerCountResult[0].count ?? 0,
        status: sessionDetails?.status,
        createdAt: sessionBase?.createdAt,
        createdBy: sessionBase?.createdBy,
      };
    })
  );

  return {
    criteria: allCriteria,
    activeSessions: sessionSummaries.filter(
      (session) => session.status === SessionStatus.active
    ),
    finishedSessions: sessionSummaries.filter(
      (session) => session.status === SessionStatus.finished
    ),
  };
}

export default function Sessions() {
  const { criteria, activeSessions, finishedSessions } =
    useLoaderData<typeof loader>();

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

          <SessionsTable sessions={finishedSessions} mode="finished" />
        </Tabs.Panel>
      </Tabs>

      <NewSession mt={30} criteria={criteria} />
    </Paper>
  );
}
