import { Outlet, useLoaderData } from "react-router";
import { AppShell, Container } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { userSessionGet } from "~/auth/users.server";
import {
  getSessionBeers,
  getSessionDetails,
  getSessionVotes,
} from "~/database/helpers";

import { Header } from "~/components/Header";
import Navbar from "~/components/Navbar";

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

  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop, close: closeDesktop }] =
    useDisclosure(false);

  const { user, sessionDetails, sessionBeers, sessionVotes } =
    useLoaderData<typeof loader>();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
    >
      <AppShell.Header>
        <Header
          user={user}
          mobileOpened={mobileOpened}
          desktopOpened={desktopOpened}
          toggleMobile={toggleMobile}
          toggleDesktop={toggleDesktop}
          sessionDetails={sessionDetails}
          sessionBeers={sessionBeers}
          sessionVotes={sessionVotes}
        />
      </AppShell.Header>

      {sessionDetails && (
        <AppShell.Navbar p="md">
          <Navbar
            sessionDetails={sessionDetails}
            sessionBeers={sessionBeers}
            closeMobile={closeMobile}
            closeDesktop={closeDesktop}
          />
        </AppShell.Navbar>
      )}

      <AppShell.Main>
        <Container size="xs" mt="md" pb="xs">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
