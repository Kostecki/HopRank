import { useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { Button, Flex, Pagination, Table } from "@mantine/core";

import dayjs from "~/utils/dayjs";

import { type SelectSession } from "~/database/schema.types";

type InputProps = {
  sessions: SelectSession[];
  mode: "active" | "inactive";
};

const perPage = 10;

export default function SessionsTable({ sessions, mode }: InputProps) {
  const [page, setPage] = useState(1);

  const fetcher = useFetcher();
  const navigate = useNavigate();

  const total = sessions.length;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedSessions = sessions.slice(start, end);

  const formatDate = (date: string) => {
    const d = dayjs(date);
    if (d.isSame(dayjs(), "day")) {
      return d.format("HH:mm");
    }

    if (d.isSame(dayjs(), "week")) {
      return d.format("dddd, HH:mm");
    }

    return dayjs(date).format("M. MMMM, HH:mm");
  };

  const handleActiveSubmit = (sessionId: number) => {
    fetcher.submit(new FormData(), {
      method: "POST",
      action: `/sessions/${sessionId}/join`,
    });
  };

  const handleInactiveClick = (sessionId: number) => {
    navigate(`/sessions/${sessionId}`);
  };

  const rows = paginatedSessions.map((session) => (
    <Table.Tr
      key={session.id}
      onClick={() =>
        mode === "active"
          ? handleActiveSubmit(session.id)
          : handleInactiveClick(session.id)
      }
      style={{ cursor: "pointer" }}
    >
      <Table.Td tt="capitalize">{session.name}</Table.Td>

      {mode === "active" ? (
        <Table.Td ta="center">{session.userCount}</Table.Td>
      ) : (
        <Table.Td ta="center">{formatDate(session.createdAt)}</Table.Td>
      )}

      <Table.Td ta="center">{session.beersCount}</Table.Td>

      <Table.Td ta="right">
        {mode === "active" ? (
          <Button
            variant="filled"
            size="xs"
            color="slateIndigo"
            loading={
              fetcher.state === "submitting" &&
              fetcher.formData?.get("sessionId") === String(session.id)
            }
          >
            Deltag
          </Button>
        ) : (
          <Button
            variant="filled"
            size="xs"
            color="slateIndigo"
            onClick={() => handleInactiveClick(session.id)}
          >
            Vis
          </Button>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  const emptyRow = (
    <Table.Tr>
      <Table.Td colSpan={4} ta="center" c="dimmed" pt="md" fs="italic">
        {mode === "active"
          ? "Ingen aktive smagninger"
          : "Ingen afsluttede smagninger"}
      </Table.Td>
    </Table.Tr>
  );

  return (
    <>
      <Table mt="lg" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Smagning</Table.Th>
            <Table.Th ta="center">
              {mode === "active" ? "Deltagere" : "Oprettet"}
            </Table.Th>
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
