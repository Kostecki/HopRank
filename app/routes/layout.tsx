import { Outlet, useLoaderData } from "react-router";
import { count, desc, eq, sql } from "drizzle-orm";
import { ActionIcon, AppShell, Container, Divider, Menu } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import {
  beersTable,
  sessionsTable,
  usersTable,
  votesTable,
} from "~/database/schema.server";

import { Header } from "~/components/Header";

import { slateIndigo } from "~/utils/utils";

import type { Route } from "../+types/root";

export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  const sessionId = Number(params.sessionId);

  let sessionDetails = undefined;
  let sessionBeers = undefined;
  let ratedBeersCount = undefined;

  if (sessionId) {
    [sessionDetails] = await db
      .select({
        id: sessionsTable.id,
        name: sessionsTable.name,
        active: sessionsTable.active,
        createdAt: sessionsTable.createdAt,
        updatedAt: sessionsTable.updatedAt,
        userCount: count(usersTable.id).as("userCount"),
      })
      .from(sessionsTable)
      .leftJoin(usersTable, eq(usersTable.activeSessionId, sessionsTable.id))
      .where(eq(sessionsTable.id, sessionId))
      .groupBy(sessionsTable.id)
      .orderBy(desc(sessionsTable.createdAt));

    sessionBeers = await db
      .select()
      .from(beersTable)
      .where(eq(beersTable.sessionId, sessionId));

    const sessionVotes = await db
      .select()
      .from(votesTable)
      .where(sql`json_extract(vote, '$.sessionId') = ${sessionId}`);

    const ratedIds = new Set(sessionVotes.map((v) => v.vote.beerId));
    const ratedBeers = sessionBeers.reduce((voted, beer) => {
      if (ratedIds.has(beer.beerId)) {
        voted.push(beer);
      }

      return voted;
    }, [] as typeof sessionBeers);

    ratedBeersCount = ratedBeers.length;
  }

  return { user, sessionDetails, sessionBeers, ratedBeersCount };
}

export default function Layout() {
  const { user, sessionDetails, sessionBeers, ratedBeersCount } =
    useLoaderData<typeof loader>();

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Header
          user={user}
          sessionDetails={sessionDetails}
          sessionBeers={sessionBeers}
          ratedBeersCount={ratedBeersCount}
        />
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xs" mt="md">
          <Outlet />

          <Menu shadow="md" width="200">
            <Menu.Target>
              <ActionIcon
                size="xl"
                radius="xl"
                pos="fixed"
                bottom={20}
                right={20}
                color="white"
                variant="default"
              >
                <IconSettings color={slateIndigo} size={20} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Smagning</Menu.Label>
              {/* <ModalAddBeer /> */}
              <Menu.Item>Opret ny smagning</Menu.Item>
              <Divider opacity={0.5} />
              <Menu.Item>Afslut smagning</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
