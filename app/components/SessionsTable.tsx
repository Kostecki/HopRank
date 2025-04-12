import { Button, Table } from "@mantine/core";
import { useFetcher } from "react-router";

import type { SessionUser } from "~/auth/auth.server";
import { type SelectSession } from "~/database/schema.types";

type InputProps = {
  user: SessionUser;
  sessions: SelectSession[];
};

export default function SessionsTable({ user, sessions }: InputProps) {
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
      <Table.Td ta="center">{session.userCount}</Table.Td>
      <Table.Td ta="center">{session.beersCount}</Table.Td>
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
    <Table mt="lg">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Smagning</Table.Th>
          <Table.Th ta="center">Deltagere</Table.Th>
          <Table.Th ta="center">Øl</Table.Th>
          <Table.Td ta="center"></Table.Td>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}
