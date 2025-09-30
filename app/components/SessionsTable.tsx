import { Button, Flex, Pagination, Table } from "@mantine/core";
import { useState } from "react";
import { useFetcher, useNavigate } from "react-router";

import dayjs from "~/utils/dayjs";

export type Session = {
	id: number;
	name: string;
	joinCode: string | undefined;
	participants: number;
	beers: number;
	status: string | undefined;
	createdAt: string | undefined;
};

type InputProps = {
	sessions: Session[];
	mode: "active" | "finished";
	readOnly?: boolean;
};

const perPage = 10;

export default function SessionsTable({
	sessions,
	mode,
	readOnly,
}: InputProps) {
	const [page, setPage] = useState(1);

	const fetcher = useFetcher();
	const navigate = useNavigate();

	const total = sessions.length;
	const start = (page - 1) * perPage;
	const end = start + perPage;
	const paginatedSessions = sessions.slice(start, end);

	const stateActive = mode === "active";

	const formatDate = (date: string | undefined) => {
		if (!date) return "-";

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
			action: `/api/sessions/${sessionId}/join`,
		});
	};

	const handleFinishedClick = (sessionId: number) => {
		navigate(`/sessions/${sessionId}/view`);
	};

	const handleRowClick = (sessionId: number) => {
		if (stateActive) {
			handleActiveSubmit(sessionId);
		} else {
			handleFinishedClick(sessionId);
		}
	};

	const rows = paginatedSessions.map((session) => (
		<Table.Tr
			key={session.id}
			onClick={() => handleRowClick(session.id)}
			style={{ cursor: "pointer" }}
		>
			<Table.Td tt="capitalize">{session.name}</Table.Td>

			{!readOnly && stateActive && (
				<Table.Td ta="center" lts={2}>
					{session.joinCode}
				</Table.Td>
			)}

			{stateActive ? (
				<Table.Td ta="center">{session.participants}</Table.Td>
			) : (
				<Table.Td ta="center">{formatDate(session.createdAt)}</Table.Td>
			)}

			{!readOnly && <Table.Td ta="center">{session.beers}</Table.Td>}

			<Table.Td ta="right">
				{stateActive && !readOnly ? (
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
						onClick={() => handleFinishedClick(session.id)}
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
				{stateActive
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
						{!readOnly && stateActive && (
							<Table.Th ta="center">Pinkode</Table.Th>
						)}
						<Table.Th ta="center">
							{stateActive ? "Deltagere" : "Oprettet"}
						</Table.Th>
						{!readOnly && <Table.Th ta="center">Øl</Table.Th>}
						<Table.Th ta="center" />
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
