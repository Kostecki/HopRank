import { Outlet, useLoaderData } from "react-router";
import { AppShell, Container } from "@mantine/core";

import { userSessionGet } from "~/auth/users.server";
import {
  getSessionBeers,
  getSessionDetails,
  getSessionVotes,
} from "~/database/helpers";

import { Header } from "~/components/Header";

import { useAutoRevalidate } from "~/hooks/useAutoRevalidate";

import { getBeersVotedByAllUsers } from "~/utils/votes";

import type { Route } from "../+types/root";

export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  const sessionId = Number(params.sessionId);

  let sessionDetails = undefined;
  let sessionBeers = undefined;
  let completedBeersCount = undefined;
  let uniqueVoterCount = undefined;

  if (sessionId) {
    sessionDetails = await getSessionDetails(sessionId);
    sessionBeers = await getSessionBeers(sessionId);
    const sessionVotes = await getSessionVotes(sessionId);

    uniqueVoterCount = new Set(sessionVotes.map((vote) => vote.userId)).size;

    completedBeersCount = getBeersVotedByAllUsers(
      sessionVotes,
      sessionDetails.userCount
    );
  }

  return {
    user,
    sessionDetails,
    sessionBeers,
    completedBeersCount,
    uniqueVoterCount,
  };
}

export default function Layout() {
  useAutoRevalidate();

  const {
    user,
    sessionDetails,
    sessionBeers,
    completedBeersCount,
    uniqueVoterCount,
  } = useLoaderData<typeof loader>();

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Header
          user={user}
          sessionDetails={sessionDetails}
          sessionBeers={sessionBeers}
          ratedBeersCount={completedBeersCount}
          uniqueVoterCount={uniqueVoterCount}
        />
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xs" mt="md" pb="xs">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
