import { Avatar, Group, Menu, Paper, Text } from "@mantine/core";
import { IconBeer, IconLogout, IconUsers } from "@tabler/icons-react";

import type { SessionUser } from "~/auth/auth.server";
import type { SelectSession, SelectSessionBeer } from "~/database/schema.types";

import { slateIndigo } from "~/utils/utils";

type SessionDetails = SelectSession & {
  userCount: number;
};

type InputProps = {
  user: SessionUser;
  sessionDetails?: SessionDetails;
  sessionBeers?: SelectSessionBeer[];
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
  return (
    <Paper shadow="md" h="100%">
      <Group justify="space-between" px="md" pt="sm">
        <Group gap="sm">
          {sessionDetails && (
            <>
              <Group gap="xs" mr="xs">
                <Text
                  c={slateIndigo}
                  fw={600}
                  tt="capitalize"
                  fs="italic"
                  size="sm"
                >
                  {sessionDetails.name}
                </Text>
              </Group>

              <Group gap="8">
                <IconUsers color={slateIndigo} size={20} />
                <Text c={slateIndigo} fw={600}>
                  {sessionDetails.userCount}
                </Text>
              </Group>
            </>
          )}
          {sessionBeers?.length && (
            <Group gap="5">
              <IconBeer color={slateIndigo} size={20} />
              <Text c={slateIndigo} fw={600}>
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
