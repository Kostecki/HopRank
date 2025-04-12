import { redirect, useLoaderData } from "react-router";
import { count, eq } from "drizzle-orm";
import { Divider, Paper, Text } from "@mantine/core";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import { beersTable } from "~/database/schema.server";
import { getActiveSessions } from "~/database/helpers";

import SessionsTable from "~/components/SessionsTable";
import NewSession from "~/components/NewSession";

import { getPageTitle } from "~/utils/utils";

import type { Route } from "./+types";

export function meta({}: Route.MetaArgs) {
  return [{ title: getPageTitle("Smagninger") }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  if (user.activeSession) {
    return redirect("/sessions/" + user.activeSession);
  }

  const activeSessionsData = await getActiveSessions();
  const activeSessions = await Promise.all(
    activeSessionsData.map(async (session) => {
      const [beersCount] = await db
        .select({ count: count() })
        .from(beersTable)
        .where(eq(beersTable.sessionId, session.id));

      return {
        ...session,
        beersCount: beersCount.count,
      };
    })
  );

  return { user, activeSessions };
}

export default function Sessions() {
  const { user, activeSessions } = useLoaderData<typeof loader>();

  return (
    <Paper p="md" radius="md" withBorder mt={64}>
      <Text fw="bold">Aktive smagninger</Text>
      <Text c="dimmed" size="sm" fs="italic">
        Vælg en aktiv smagning for at deltage
      </Text>

      <SessionsTable user={user} sessions={activeSessions} />

      <Divider opacity={0.4} my="lg" />

      <NewSession />
    </Paper>
  );
}
