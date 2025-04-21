import { useFetcher } from "react-router";
import {
  Avatar,
  Button,
  Divider,
  Group,
  Menu,
  Paper,
  Text,
  useMantineTheme,
} from "@mantine/core";
import {
  IconBeer,
  IconDoorExit,
  IconLogout,
  IconPlus,
  IconUsers,
} from "@tabler/icons-react";

import ModalAddBeers, { ModalAddBeersTrigger } from "./modals/ModalAddBeers";

import type { SessionUser } from "~/auth/auth.server";
import type {
  SelectBeer,
  SelectSession,
  SelectVote,
} from "~/database/schema.types";
import { getBeersVotedByAllUsers } from "~/utils/votes";

type InputProps = {
  user: SessionUser;
  sessionDetails?: SelectSession;
  sessionBeers?: SelectBeer[];
  sessionVotes?: SelectVote[];
};

const User = ({ user }: { user: SessionUser }) => {
  const { email } = user;
  const firstLetter = email.slice(0, 1).toUpperCase();

  return (
    <Menu shadow="md" width="auto" withArrow>
      <Menu.Target>
        <Avatar style={{ cursor: "pointer" }}>{firstLetter}</Avatar>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{email}</Menu.Label>
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
  sessionDetails,
  sessionBeers,
  sessionVotes,
}: InputProps) {
  const theme = useMantineTheme();
  const fetcher = useFetcher();

  const slateIndigo = theme.colors.slateIndigo[6];

  const activeSession = sessionDetails?.active;
  const uniqueVoterCount = new Set(sessionVotes?.map((vote) => vote.userId))
    .size;
  const ratedBeersCount = getBeersVotedByAllUsers(
    sessionVotes,
    sessionDetails?.userCount
  );

  const handleLeaveSession = () => {
    const formData = new FormData();
    fetcher.submit(formData, {
      method: "POST",
      action: "/sessions/leave",
    });
  };

  return (
    <Paper shadow="md" h="100%">
      <Group justify="space-between" px="md" pt="sm">
        <Group gap="sm">
          {sessionDetails && (
            <>
              <Group gap="xs" mr="xs">
                <ModalAddBeers sessionBeers={sessionBeers}>
                  <Menu shadow="md" withArrow width="auto">
                    <Menu.Target>
                      <Button
                        c="slateIndigo"
                        color="slateIndigo"
                        variant="outline"
                      >
                        Smagning
                      </Button>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Label tt="capitalize">
                        {sessionDetails.name}
                      </Menu.Label>

                      <ModalAddBeersTrigger>
                        <Menu.Item
                          leftSection={<IconPlus size={14} />}
                          disabled={!sessionDetails.active}
                        >
                          Tilføj øl til smagningen
                        </Menu.Item>
                      </ModalAddBeersTrigger>

                      <Divider opacity={0.5} />

                      <Menu.Item
                        onClick={handleLeaveSession}
                        leftSection={<IconDoorExit size={14} />}
                      >
                        Forlad smagningen
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </ModalAddBeers>
              </Group>

              <Group gap="8">
                <IconUsers color={slateIndigo} size={20} />
                <Text c="slateIndigo" fw={600}>
                  {activeSession ? sessionDetails.userCount : uniqueVoterCount}
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
