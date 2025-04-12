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
import { useFetcher } from "react-router";

import type { SessionUser } from "~/auth/auth.server";
import type { SelectBeer, SelectSession } from "~/database/schema.types";

type InputProps = {
  user: SessionUser;
  sessionDetails?: SelectSession;
  sessionBeers?: SelectBeer[];
  ratedBeersCount?: number;
};

const User = ({ user }: { user: SessionUser }) => {
  const { name, picture } = user;

  return (
    <Menu width={150}>
      <Menu.Target>
        <Avatar src={picture.url} alt={name} style={{ cursor: "pointer" }} />
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>{name}</Menu.Label>
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
  ratedBeersCount,
}: InputProps) {
  const theme = useMantineTheme();
  const fetcher = useFetcher();

  const slateIndigo = theme.colors.slateIndigo[6];

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
                <Menu shadow="md" withArrow width={175}>
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
                    <Menu.Label>{sessionDetails.name}</Menu.Label>
                    <Menu.Item leftSection={<IconPlus size={14} />}>
                      Tilføj øl
                    </Menu.Item>

                    <Divider opacity={0.5} />

                    <Menu.Item
                      onClick={handleLeaveSession}
                      leftSection={<IconDoorExit size={14} />}
                    >
                      Forlad smagning
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              <Group gap="8">
                <IconUsers color={slateIndigo} size={20} />
                <Text c="slateIndigo" fw={600}>
                  {sessionDetails.userCount}
                </Text>
              </Group>
            </>
          )}
          {sessionBeers?.length && (
            <Group gap="5">
              <IconBeer color={slateIndigo} size={20} />
              <Text c="slateIndigo" fw={600}>
                {`${ratedBeersCount} / ${sessionBeers.length}`}
              </Text>
            </Group>
          )}
        </Group>
        {user && <User user={user} />}
      </Group>
    </Paper>
  );
}
