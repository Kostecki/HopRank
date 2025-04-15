import { redirect, useLoaderData } from "react-router";
import { count, eq } from "drizzle-orm";
import { Divider, Paper, Tabs, Text } from "@mantine/core";

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

          <SessionsTable user={user} sessions={activeSessions} />
        </Tabs.Panel>

        <Tabs.Panel value="past">
          <Text c="dimmed" size="sm" fs="italic">
            Se tidligere smagninger
          </Text>

          <Text size="xl" c="dimmed" fs="italic" ta="center">
            Yet to be implemented
          </Text>

          {/* <SessionsTable user={user} sessions={activeSessions} /> */}
        </Tabs.Panel>
      </Tabs>

      <NewSession mt={30} />
    </Paper>
  );
}
