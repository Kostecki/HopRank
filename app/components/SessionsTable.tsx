import { useState } from "react";
import { useFetcher } from "react-router";
import { Button, Flex, Pagination, Table } from "@mantine/core";

import type { SessionUser } from "~/auth/auth.server";
import { type SelectSession } from "~/database/schema.types";

type InputProps = {
  user: SessionUser;
  sessions: SelectSession[];
};

const perPage = 10;

export default function SessionsTable({ user, sessions }: InputProps) {
  const [page, setPage] = useState(1);

  const fetcher = useFetcher();

  const total = sessions.length;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedSessions = sessions.slice(start, end);

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

  const rows = paginatedSessions.map((session) => (
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
    <>
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

      {total > perPage && (
        <Flex justify="center" mt="lg">
          <Pagination
            total={Math.ceil(total / perPage)}
            value={page}
            onChange={setPage}
            radius="md"
            size="sm"
          />
        </Flex>
      )}
    </>
  );
}
