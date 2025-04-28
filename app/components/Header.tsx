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

import { getBeersVotedByAllUsers } from "~/utils/votes";

import type { SessionUser } from "~/auth/auth.server";
import type {
  SelectBeer,
  SelectSession,
  SelectVote,
} from "~/database/schema.types";

type InputProps = {
  user: SessionUser;
  mobileOpened: boolean;
  desktopOpened: boolean;
  toggleMobile: () => void;
  toggleDesktop: () => void;
  sessionDetails?: SelectSession;
  sessionBeers?: SelectBeer[];
  sessionVotes?: SelectVote[];
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
  mobileOpened,
  desktopOpened,
  toggleMobile,
  toggleDesktop,
  sessionDetails,
  sessionBeers,
  sessionVotes,
}: InputProps) {
  const theme = useMantineTheme();

  const slateIndigo = theme.colors.slateIndigo[6];

  const activeSession = sessionDetails?.active;
  const uniqueVoterCount = new Set(sessionVotes?.map((vote) => vote.userId))
    .size;
  const ratedBeersCount = getBeersVotedByAllUsers(
    sessionVotes,
    sessionDetails?.users.totalCount
  );

  return (
    <Paper shadow="md" h="100%">
      <Group justify="space-between" px="md" pt="sm">
        <Group gap="sm">
          {sessionDetails && (
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
                  {activeSession
                    ? sessionDetails.users.totalCount
                    : uniqueVoterCount}
                </Text>
              </Group>
              <Group gap="5">
                <IconBeer color={slateIndigo} size={20} />
                <Text c="slateIndigo" fw={600}>
                  {activeSession
                    ? `${ratedBeersCount ?? 0} / ${sessionBeers?.length ?? 0}`
                    : sessionBeers?.length}
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
