import { Link } from "react-router";
import { useRevalidator } from "react-router";
import {
  Avatar,
  Burger,
  Group,
  Menu,
  MenuDivider,
  Paper,
  Stack,
  Text,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { IconBeer, IconLogout, IconUsers } from "@tabler/icons-react";

import { useSocket } from "~/hooks/useSocket";
import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";

import { createProfileLink } from "~/utils/untappd";

import type { SessionUser } from "~/types/user";
import { SessionStatus, type SessionProgress } from "~/types/session";
import { useEffect, useState } from "react";

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

  const [connected, setConnected] = useState(false);

  const socket = useSocket();

  useEffect(() => {
    if (socket) {
      setConnected(socket.connected);
      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));

      return () => {
        socket.off("connect", () => setConnected(true));
        socket.off("disconnect", () => setConnected(false));
      };
    }
  }, [socket]);

  const LATEST_COMMIT_HASH = import.meta.env.VITE_LATEST_COMMIT_HASH;
  const LATEST_COMMIT_MESSAGE = import.meta.env.VITE_LATEST_COMMIT_MESSAGE;
  const COMMIT_URL = `https://github.com/Kostecki/HopRank/commit/${LATEST_COMMIT_HASH}`;

  return (
    <Menu shadow="md" width="auto" withArrow>
      <Menu.Target>
        <Avatar
          src={untappd?.avatar}
          radius="100%"
          size="md"
          style={{
            cursor: "pointer",
            boxShadow: connected ? "0 0 0 1.5px #4caf50" : undefined,
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
        {user.email === "jacob@kostecki.dk" && (
          <>
            <MenuDivider />

            <Menu.Item component={Link} to={COMMIT_URL} target="_blank">
              <Tooltip label={LATEST_COMMIT_MESSAGE} withArrow position="left">
                <Text size="xs" c="dimmed" fs="italic" fw={300}>
                  Latest Commit: {LATEST_COMMIT_HASH}
                </Text>
              </Tooltip>
            </Menu.Item>
          </>
        )}
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
            </>
          )}
        </Group>
        {user && <User user={user} />}
      </Group>
    </Paper>
  );
}
