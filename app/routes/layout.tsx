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

import type { Route } from "../+types/root";

export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await userSessionGet(request);

  const sessionId = Number(params.sessionId);
  const [sessionDetails, sessionBeers, sessionVotes] = await Promise.all([
    getSessionDetails(sessionId),
    getSessionBeers(sessionId),
    getSessionVotes(sessionId),
  ]);

  return {
    user,
    sessionDetails,
    sessionBeers,
    sessionVotes,
  };
}

export default function Layout() {
  useAutoRevalidate();

  const { user, sessionDetails, sessionBeers, sessionVotes } =
    useLoaderData<typeof loader>();

  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Header
          user={user}
          sessionDetails={sessionDetails}
          sessionBeers={sessionBeers}
          sessionVotes={sessionVotes}
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
