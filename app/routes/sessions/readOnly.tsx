import { Box, Grid, Table } from "@mantine/core";
import { useLoaderData, useRevalidator } from "react-router";
import MedalPodium from "~/components/MedalPodium";
import { db } from "~/database/config.server";
import { users } from "~/database/schema.server";
import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";
import type { SessionProgress, SessionProgressUser } from "~/types/session";
import { createBeerLink } from "~/utils/untappd";
import { extractSessionId, getPageTitle } from "~/utils/utils";
import type { Route } from "./+types";

export function meta() {
	return [{ title: getPageTitle("Smagning") }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
	if (!params?.sessionId) {
		throw new Response("Session ID is required", { status: 400 });
	}

	const sessionId = extractSessionId(params.sessionId);

	const url = new URL(request.url);
	const origin = `${url.protocol}//${url.host}`;
	const progressResponse = await fetch(
		`${origin}/api/sessions/${sessionId}/progress`,
		{
			headers: {
				"Content-Type": "application/json",
			},
		},
	);

	if (!progressResponse.ok) {
		throw new Response("Failed to fetch session progress", { status: 500 });
	}

	const sessionProgress = (await progressResponse.json()) as SessionProgress;
	const allUsers = await db.select().from(users);

	return {
		sessionProgress,
		allUsers: allUsers as SessionProgressUser[],
	};
}

const viewBeerUntappd = (untappdBeerId: number) => {
	const untappdLink = createBeerLink(untappdBeerId);
	window.open(untappdLink, "_blank");
};

export default function SessionView() {
	const { sessionProgress, allUsers } = useLoaderData<typeof loader>();

	const { revalidate } = useRevalidator();

	useDebouncedSocketEvent(
		[
			"sessions:created",
			"session:users-changed",
			"session:beer-changed",
			"session:vote",
		],
		async () => revalidate(),
		sessionProgress.sessionId,
	);

	const nonPodiumBeers = sessionProgress.ratedBeers.slice(3);

	const tableRows = nonPodiumBeers.map((beer, index) => {
		const addedBy = allUsers.find((user) => user.id === beer.addedByUserId);

		return (
			<Table.Tr
				key={beer.name}
				onClick={() => viewBeerUntappd(beer.untappdBeerId)}
			>
				<Table.Td ta="center">{index + 4}</Table.Td>
				<Table.Td ta="center">{beer.name}</Table.Td>
				<Table.Td ta="center">{beer.breweryName}</Table.Td>
				<Table.Td ta="center">{addedBy?.name}</Table.Td>
				<Table.Td ta="center">{beer.averageScore}</Table.Td>
			</Table.Tr>
		);
	});

	return (
		<Box data-breakout m="md" p="md">
			<MedalPodium session={sessionProgress} users={allUsers} />

			<Grid mt={50} justify="center" gutter="xl">
				<Grid.Col span={8}>
					<Table highlightOnHover>
						<Table.Thead>
							<Table.Tr>
								<Table.Th ta="center">#</Table.Th>
								<Table.Th ta="center">Øl</Table.Th>
								<Table.Th ta="center">Bryggeri</Table.Th>
								<Table.Th ta="center">Tilføjet af</Table.Th>
								<Table.Th ta="center">Rating</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>{tableRows}</Table.Tbody>
					</Table>
				</Grid.Col>
			</Grid>
		</Box>
	);
}
