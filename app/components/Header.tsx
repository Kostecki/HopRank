import { Avatar, Group, Menu, Paper, Text } from "@mantine/core";
import { IconBeer, IconLogout, IconUsers } from "@tabler/icons-react";
import type { SessionUser } from "~/auth/auth.server";

import { slateIndigo } from "~/utils/utils";

type InputProps = {
  user: SessionUser;
  sessionBeerCount: number;
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

export function Header({ user, sessionBeerCount }: InputProps) {
  const getSessionUserCount = () => {
    // All distinct Users with session id
    return 5;
  };

  return (
    <Paper shadow="md" h="100%">
      <Group justify="space-between" px="md" pt="sm">
        <Group gap="xs">
          <Group gap="xs" mr="xs">
            <Text c={slateIndigo} fw="600" tt="capitalize" fs="italic">
              clingy-impala
            </Text>
          </Group>
          <Group gap="xs">
            <IconUsers color={slateIndigo} size={20} />
            <Text c={slateIndigo} fw="600">
              {getSessionUserCount()}
            </Text>
          </Group>
          <Group gap="xs">
            <IconBeer color={slateIndigo} size={20} />
            <Text c={slateIndigo} fw="600">
              {`1 / ${sessionBeerCount}`}
            </Text>
          </Group>
        </Group>
        {user && <User user={user} />}
      </Group>
    </Paper>
  );
}
