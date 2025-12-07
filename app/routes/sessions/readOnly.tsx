import { Box, Flex, Grid, Group, Paper, Table, Text } from "@mantine/core";
import { useMemo } from "react";
import { useLoaderData, useRevalidator } from "react-router";

import type { SessionProgress } from "~/types/session";
import type { SocketEvent } from "~/types/websocket";
import type { Route } from "./+types/readOnly";

import MedalPodium from "~/components/MedalPodium";
import SessionStatsCard from "~/components/SessionStatsCard";
import { getSessionProgress } from "~/database/utils/getSessionProgress.server";
import { getSessionStats } from "~/database/utils/getStats.server";
import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";
import { groupRatedBeersByScore } from "~/utils/podium";
import { createBeerLink } from "~/utils/untappd";
import { displayScore, extractSessionId, getPageTitle } from "~/utils/utils";

export function meta() {
	return [{ title: getPageTitle("Smagning") }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
	if (!params?.sessionId) {
		throw new Response("Session ID is required", { status: 400 });
	}

	const sessionId = extractSessionId(params.sessionId);
	const sessionProgressResult = await getSessionProgress({
		request,
		sessionId,
	});

	if ("statusCode" in sessionProgressResult) {
		throw new Response("Session not found", {
			status: sessionProgressResult.statusCode ?? 404,
		});
	}

	const sessionProgress: SessionProgress = sessionProgressResult;
	const sessionStats = await getSessionStats(sessionId);

	return {
		sessionProgress,
		sessionStats,
	};
}

const viewBeerUntappd = (untappdBeerId: number) => {
	const untappdLink = createBeerLink(untappdBeerId);
	window.open(untappdLink, "_blank");
};

export default function SessionView() {
	const { sessionProgress, sessionStats } = useLoaderData<typeof loader>();

	const { revalidate } = useRevalidator();

	const socketEvents = useMemo<SocketEvent[]>(
		() => [
			"sessions:created",
			"session:users-changed",
			"session:beer-changed",
			"session:vote",
		],
		[],
	);

	useDebouncedSocketEvent(
		socketEvents,
		async () => revalidate(),
		sessionProgress.sessionId,
	);

	const { podiumGroups, nonPodiumGroups } = useMemo(() => {
		const rankedGroups = groupRatedBeersByScore(sessionProgress.ratedBeers);
		const topGroups = rankedGroups.slice(0, 3);
		const remainingGroups = rankedGroups.slice(topGroups.length);

		return {
			podiumGroups: topGroups,
			nonPodiumGroups: remainingGroups,
		};
	}, [sessionProgress.ratedBeers]);

	const tableRows = nonPodiumGroups.flatMap((group, groupIndex) => {
		const rank = podiumGroups.length + groupIndex + 1;

		return group.beers.map((beer, beerIndex) => {
			const beerAddedByUserId = beer.addedByUserId;
			const user = sessionProgress.users.find(
				(sessionUser) => sessionUser.id === beerAddedByUserId,
			);
			const addedByName = user?.name || "";

			return (
				<Table.Tr
					key={`${rank}-${beer.untappdBeerId}`}
					onClick={() => viewBeerUntappd(beer.untappdBeerId)}
				>
					{beerIndex === 0 && (
						<Table.Td ta="center" rowSpan={group.beers.length} fw={600}>
							{rank}
						</Table.Td>
					)}
					<Table.Td ta="center">{beer.name}</Table.Td>
					<Table.Td ta="center">{beer.style}</Table.Td>
					<Table.Td ta="center">{beer.breweryName}</Table.Td>
					<Table.Td ta="center">{addedByName}</Table.Td>
					<Table.Td ta="center">{displayScore(group.score)}</Table.Td>
				</Table.Tr>
			);
		});
	});

	const hasRatings = sessionProgress.ratedBeers.length > 0;
	const showTablePlaceholder =
		hasRatings && sessionProgress.ratedBeers.length < 4;

	return (
		<Box data-breakout mt="md">
			<MedalPodium session={sessionProgress} />

			{!hasRatings && (
				<Flex justify="center" mt="xl">
					<Paper
						withBorder
						radius="md"
						p="lg"
						mt={40}
						shadow="sm"
						style={{
							background:
								"linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(245,245,250,0.9) 100%)",
							backdropFilter: "blur(4px)",
						}}
					>
						<Group justify="space-between" mb="xs">
							<Text fw={700} size="lg">
								Ingen bedømte øl endnu
							</Text>
						</Group>
						<Text size="sm" c="gray.7" mb="md">
							Når en øl er færdigbedømt vises den her - og podiet kan begynde at
							tage form.
						</Text>
						<Group mb="xs" gap="xs">
							<Text size="xs" c="dimmed">
								{sessionProgress.beersTotalCount} øl tilføjet
							</Text>
							<Text size="xs" c="dimmed">
								•
							</Text>
							<Text size="xs" c="dimmed">
								Deltagere: {sessionProgress.users.length}
							</Text>
						</Group>
					</Paper>
				</Flex>
			)}

			{hasRatings && (
				<>
					<Grid justify="center">
						<Grid.Col span={10}>
							<SessionStatsCard mt={25} sessionStats={sessionStats} />
						</Grid.Col>
					</Grid>

					<Grid mt={50} justify="center" gutter="xl">
						<Grid.Col span={10}>
							<Table highlightOnHover={!showTablePlaceholder}>
								<Table.Thead>
									<Table.Tr>
										<Table.Th ta="center">#</Table.Th>
										<Table.Th ta="center">Øl</Table.Th>
										<Table.Th ta="center">Stiltype</Table.Th>
										<Table.Th ta="center">Bryggeri</Table.Th>
										<Table.Th ta="center">Tilføjet af</Table.Th>
										<Table.Th ta="center">Score</Table.Th>
									</Table.Tr>
								</Table.Thead>
								<Table.Tbody>
									{showTablePlaceholder ? (
										<Table.Tr>
											<Table.Td colSpan={5} ta="center" c="gray.6">
												Her er endnu ingen øl at vise
											</Table.Td>
										</Table.Tr>
									) : (
										tableRows
									)}
								</Table.Tbody>
							</Table>
						</Grid.Col>
					</Grid>
				</>
			)}
		</Box>
	);
}
