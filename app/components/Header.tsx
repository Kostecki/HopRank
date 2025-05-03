import {
  Avatar,
  Burger,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { IconBeer, IconLogout, IconUsers } from "@tabler/icons-react";

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
  const { email, name, avatar } = user;
  const firstLetter = email.slice(0, 1).toUpperCase();

  return (
    <Menu shadow="md" width="auto" withArrow>
      <Menu.Target>
        <Avatar src={avatar} style={{ cursor: "pointer" }}>
          {firstLetter}
        </Avatar>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Stack gap={0}>
            <Text fw={500} size="sm" c="slateIndigo">
              {name ?? email}
            </Text>
            {name && (
              <Text c="dimmed" fw={500} size="xs" fs="italic">
                {email}
              </Text>
            )}
          </Stack>
        </Menu.Label>
        <Menu.Divider />
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
            </>
          )}
        </Group>
        {user && <User user={user} />}
      </Group>
    </Paper>
  );
}
