import { Link } from "react-router";
import { useRevalidator } from "react-router";
import {
  Avatar,
  Burger,
  Button,
  CopyButton,
  Divider,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { IconBeer, IconLogout, IconUsers } from "@tabler/icons-react";

import { useSocket } from "~/hooks/useSocket";
import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";

import { createProfileLink } from "~/utils/untappd";

import type { SessionUser } from "~/types/user";
import { SessionStatus, type SessionProgress } from "~/types/session";

type InputProps = {
  user: SessionUser | null;
  session: SessionProgress | null;
  mobileOpened: boolean;
  desktopOpened: boolean;
  toggleMobile: () => void;
  toggleDesktop: () => void;
};

const User = ({ user }: { user: SessionUser }) => {
  const { email, untappd } = user;
  const firstLetter = email.slice(0, 1).toUpperCase();

  const socket = useSocket();

  return (
    <Menu shadow="md" width="auto" withArrow>
      <Menu.Target>
        <Avatar
          src={untappd?.avatar}
          radius="100%"
          size="md"
          style={{
            cursor: "pointer",
            boxShadow: socket?.connected ? "0 0 0 1.5px #4caf50" : undefined,
            transition: "box-shadow 0.2s ease-in-out",
          }}
        >
          {firstLetter}
        </Avatar>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Stack gap={0}>
            <Text fw={500} size="sm" c="slateIndigo">
              {untappd?.name ?? email}
            </Text>
            {untappd?.name && (
              <Text c="dimmed" fw={500} size="xs" fs="italic">
                {email}
              </Text>
            )}
          </Stack>
        </Menu.Label>
        <Menu.Divider />
        {untappd?.username && (
          <Menu.Item
            component={Link}
            to={createProfileLink(untappd?.username)}
            target="_blank"
            leftSection={<IconBeer size={16} />}
          >
            Untappd
          </Menu.Item>
        )}
        <Menu.Item
          component="a"
          href="/auth/logout"
          leftSection={<IconLogout size={16} />}
        >
          Log ud
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export function Header({
  user,
  session,
  mobileOpened,
  desktopOpened,
  toggleMobile,
  toggleDesktop,
}: InputProps) {
  const theme = useMantineTheme();
  const slateIndigo = theme.colors.slateIndigo[6];

  const { revalidate } = useRevalidator();

  useDebouncedSocketEvent(
    ["session:users-changed"],
    () => revalidate(),
    session?.sessionId
  );

  return (
    <Paper shadow="md" h="100%">
      <Group justify="space-between" px="md" pt="sm">
        <Group gap="sm">
          {session && (
            <>
              <Group gap="xs" mr="xs">
                <Burger
                  opened={mobileOpened}
                  onClick={toggleMobile}
                  hiddenFrom="sm"
                  size="sm"
                />
                <Burger
                  opened={desktopOpened}
                  onClick={toggleDesktop}
                  visibleFrom="sm"
                  size="sm"
                />
              </Group>
              <Group gap="8">
                <IconUsers color={slateIndigo} size={20} />
                <Text c="slateIndigo" fw={600}>
                  {/* TODO: show users in old session when viewing old session */}
                  {session.users.length}
                </Text>
              </Group>
              <Group gap="5">
                <IconBeer color={slateIndigo} size={20} />
                <Text c="slateIndigo" fw={600}>
                  {session.status === SessionStatus.active
                    ? `${session.beersRatedCount} / ${session.beersTotalCount}`
                    : session.beersTotalCount}
                </Text>
              </Group>
              <Divider orientation="vertical" />
              <Text c="slateIndigo" fw={600}>
                {session.sessionName}
              </Text>
              <Group gap="5">
                <CopyButton value={session.joinCode}>
                  {({ copied, copy }) => (
                    <Button color="slateIndigo" variant="light" onClick={copy}>
                      {copied ? "Kopieret" : session.joinCode}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </>
          )}
        </Group>
        {user && <User user={user} />}
      </Group>
    </Paper>
  );
}
