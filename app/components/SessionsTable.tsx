import { Box, Button, Paper, Table, Text, type BoxProps } from "@mantine/core";
import { useFetcher } from "react-router";

import type { SessionUser } from "~/auth/auth.server";
import { type SelectSession } from "~/database/schema.types";

import dayjs from "~/utils/day";

type InputProps = {
  user: SessionUser;
  sessions: SelectSession[];
} & BoxProps;

const formatDate = (date: string | Date) => {
  const d = dayjs(date);

  if (d.isToday()) return d.format("HH:mm");
  if (d.isYesterday()) return d.format("I går, HH:mm");

  return d.format("D. MMMM, HH:mm");
};
export default function SessionsTable({
  user,
  sessions,
  ...props
}: InputProps) {
  const fetcher = useFetcher();

  const handleSubmit = (userId: number, sessionId: number) => {
    const data = {
      userId,
      sessionId,
    };

    fetcher.submit(data, {
      method: "POST",
      action: `/sessions/${sessionId}/join`,
    });
  };

  const rows = sessions.map((session) => (
    <Table.Tr key={session.id}>
      <Table.Td tt="capitalize">{session.name}</Table.Td>
      <Table.Td>{formatDate(session.createdAt)}</Table.Td>
      <Table.Td ta="center">{session.userCount}</Table.Td>
      <Table.Td ta="center">
        <Button
          variant="light"
          size="xs"
          color="teal"
          onClick={() => handleSubmit(user.id, session.id)}
          loading={
            fetcher.state === "submitting" &&
            fetcher.formData?.get("sessionId") === String(session.id)
          }
        >
          Deltag
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box {...props}>
      <Paper p="md" radius="md" withBorder>
        <Text fw="bold">Aktive smagninger</Text>
        <Text c="dimmed" size="sm" fs="italic">
          Vælg en aktiv smagning for at deltage
        </Text>

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
}
