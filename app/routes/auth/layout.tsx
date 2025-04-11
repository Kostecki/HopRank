import { AppShell, Container } from "@mantine/core";
import { Outlet } from "react-router";

export default function Layout() {
  return (
    <AppShell>
      <AppShell.Main>
        <Container size="xs">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
