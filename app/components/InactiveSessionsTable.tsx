import { useState } from "react";
import { useFetcher } from "react-router";
import { Button, Flex, Pagination, Table } from "@mantine/core";

import { type SelectSession } from "~/database/schema.types";

type InputProps = {
  sessions: SelectSession[];
};

const perPage = 10;

export default function InactiveSessionsTable({ sessions }: InputProps) {
  const [page, setPage] = useState(1);

  const fetcher = useFetcher();

  const total = sessions.length;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedSessions = sessions.slice(start, end);

  const handleSubmit = (sessionId: number) => {
    fetcher.submit(new FormData(), {
      method: "POST",
      action: `/sessions/${sessionId}/join`,
    });
  };

  const rows = paginatedSessions.map((session) => (
    <Table.Tr
      key={session.id}
      onClick={() => handleSubmit(session.id)}
      style={{ cursor: "pointer" }}
    >
      <Table.Td tt="capitalize">{session.name}</Table.Td>
      <Table.Td ta="center">
        {new Date(session.createdAt).toLocaleDateString("da-DK", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })}
      </Table.Td>
      <Table.Td ta="center">{session.beersCount}</Table.Td>
      <Table.Td ta="right">
        <Button
          variant="filled"
          size="xs"
          color="slateIndigo"
          loading={
            fetcher.state === "submitting" &&
            fetcher.formData?.get("sessionId") === String(session.id)
          }
        >
          Detaljer
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  const emptyRow = (
    <Table.Tr>
      <Table.Td colSpan={4} ta="center" c="dimmed" pt="md" fs="italic">
        Ingen aktive smagninger
      </Table.Td>
    </Table.Tr>
  );

  return (
    <>
      <Table mt="lg" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Smagning</Table.Th>
            <Table.Th ta="center">Oprettet</Table.Th>
            <Table.Th ta="center">Øl</Table.Th>
            <Table.Td ta="center"></Table.Td>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows.length > 0 ? rows : emptyRow}</Table.Tbody>
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
