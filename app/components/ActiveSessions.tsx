import { Box, Button, Divider, Paper, Table, Text } from "@mantine/core";

import type { SelectSession } from "~/database/schema.server";

import { dayjsExt as dayjs } from "~/utils/day";
import type { SessionUser } from "~/auth/auth.server";

type InputProps = {
  user: SessionUser;
  activeSessions: SelectSession[];
};

const formatDate = (date: string) => {
  return dayjs(date).format("DD-MM-YYYY, HH:mm");
};

const joinSession = (sessionId: number, user: SessionUser) => {
  console.log("Join session", sessionId, "user", user.id);
};

export const ActiveSessions = ({ user, activeSessions }: InputProps) => {
  // TODO: Get actual value
  const rows = activeSessions.map((session) => (
    <Table.Tr key={session.id}>
      <Table.Td>{session.name}</Table.Td>
      <Table.Td>{formatDate(session.createdAt)}</Table.Td>
      <Table.Td ta="center">7</Table.Td>
      <Table.Td ta="center">
        <Button
          variant="light"
          size="xs"
          color="teal"
          onClick={() => joinSession(session.id, user)}
        >
          Deltag
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box mt="50">
      <Paper p="md" radius="md">
        <Text fw="500">Deltag i en eksisterende smagning</Text>

        <Divider opacity={0.75} my="sm" />

        <Table mt="lg">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Smagning</Table.Th>
              <Table.Th>Oprettet</Table.Th>
              <Table.Th ta="center">Deltagere</Table.Th>
              <Table.Td ta="center"></Table.Td>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
    </Box>
  );
};
