import { Outlet, useLoaderData } from "react-router";
import { ActionIcon, AppShell, Container } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { userSessionGet } from "~/auth/users.server";
import {
  getSessionBeers,
  getSessionDetails,
  getSessionVotes,
} from "~/database/helpers";

import { Header } from "~/components/Header";

import type { Route } from "../+types/root";
import { getBeersVotedByAllUsers } from "~/utils/votes";

export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  const sessionId = Number(params.sessionId);

  let sessionDetails = undefined;
  let sessionBeers = undefined;
  let completedBeersCount = undefined;

  if (sessionId) {
    sessionDetails = await getSessionDetails(sessionId);
    sessionBeers = await getSessionBeers(sessionId);
    const sessionVotes = await getSessionVotes(sessionId);

    completedBeersCount = getBeersVotedByAllUsers(
      sessionVotes,
      sessionDetails.userCount
    );
  }

  return { user, sessionDetails, sessionBeers, completedBeersCount };
}

export default function Layout() {
  const { user, sessionDetails, sessionBeers, completedBeersCount } =
    useLoaderData<typeof loader>();

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Header
          user={user}
          sessionDetails={sessionDetails}
          sessionBeers={sessionBeers}
          ratedBeersCount={completedBeersCount}
        />
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xs" mt="md">
          <Outlet />

          <ActionIcon
            size="xl"
            radius="xl"
            pos="fixed"
            bottom={20}
            right={20}
            color="white"
            variant="default"
          >
            <IconPlus size={20} />
          </ActionIcon>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
