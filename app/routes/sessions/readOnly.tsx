import { Box, Flex, Group, Paper, Table, Text } from "@mantine/core";
import { useMemo } from "react";
import { useLoaderData, useRevalidator } from "react-router";

import { SessionMode, type SessionProgress } from "~/types/session";
import type { SocketEvent } from "~/types/websocket";
import type { Route } from "./+types/readOnly";

import MedalPodium from "~/components/MedalPodium";
import OneBeerResults from "~/components/OneBeerResults";
import ResultsSection from "~/components/ResultsSection";
import SessionStatsCard from "~/components/SessionStatsCard";
import { requireResultsViewer } from "~/database/utils/assertSessionAccess.server";
import { getSessionProgress } from "~/database/utils/getSessionProgress.server";
import { getSessionStats } from "~/database/utils/getStats.server";
import { getOneBeerRanking } from "~/database/utils/oneBeer.server";
import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";
import { groupByAverageScore } from "~/utils/podium";
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
	await requireResultsViewer(request, sessionId);

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

	if (sessionProgress.mode === SessionMode.oneBeer) {
		return {
			sessionProgress,
			sessionStats: null,
			oneBeerRanking: await getOneBeerRanking(sessionId),
		};
	}

	const sessionStats = await getSessionStats(sessionId);

	return {
		sessionProgress,
		sessionStats,
		oneBeerRanking: null,
	};
}

const viewBeerUntappd = (untappdBeerId: number) => {
	const untappdLink = createBeerLink(untappdBeerId);
	window.open(untappdLink, "_blank");
};

export default function SessionView() {
	const { sessionProgress, sessionStats, oneBeerRanking } =
		useLoaderData<typeof loader>();

	const { revalidate } = useRevalidator();

	const socketEvents = useMemo<SocketEvent[]>(
		() => ["session:users-changed", "session:beer-changed", "session:vote"],
		[],
	);

	useDebouncedSocketEvent(
		socketEvents,
		async () => revalidate(),
		sessionProgress.sessionId,
	);

	const { podiumGroups, nonPodiumGroups } = useMemo(() => {
		const rankedGroups = groupByAverageScore(sessionProgress.ratedBeers);
		const topGroups = rankedGroups.slice(0, 3);
		const remainingGroups = rankedGroups.slice(topGroups.length);

		return {
			podiumGroups: topGroups,
			nonPodiumGroups: remainingGroups,
		};
	}, [sessionProgress.ratedBeers]);

	const podiumEntries = useMemo(
		() =>
			sessionProgress.ratedBeers.map((beer) => ({
				id: beer.beerId,
				label: beer.label,
				title: beer.name,
				subtitle: beer.breweryName,
				averageScore: beer.averageScore,
				addedByUserId: beer.addedByUserId,
				href: createBeerLink(beer.untappdBeerId),
			})),
		[sessionProgress.ratedBeers],
	);

	if (oneBeerRanking) {
		return (
			<OneBeerResults users={sessionProgress.users} ranking={oneBeerRanking} />
		);
	}

	const tableRows = nonPodiumGroups.flatMap((group, groupIndex) => {
		const rank = podiumGroups.length + groupIndex + 1;

		return group.entries.map((beer, beerIndex) => {
			const beerAddedByUserId = beer.addedByUserId;
			const user = sessionProgress.users.find(
				(sessionUser) => sessionUser.id === beerAddedByUserId,
			);
			const addedByName = user?.name || "";

			return (
				<Table.Tr
					key={`${rank}-${beer.untappdBeerId}`}
					onClick={() => viewBeerUntappd(beer.untappdBeerId)}
					style={{ cursor: "pointer" }}
				>
					{beerIndex === 0 && (
						<Table.Td ta="center" rowSpan={group.entries.length} fw={600}>
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

	const unratedRows = sessionProgress.unratedBeers.map((beer) => {
		const user = sessionProgress.users.find(
			(sessionUser) => sessionUser.id === beer.addedByUserId,
		);
		const addedByName = user?.name || "";

		return (
			<Table.Tr
				key={`unrated-${beer.untappdBeerId}`}
				onClick={() => viewBeerUntappd(beer.untappdBeerId)}
				style={{ cursor: "pointer" }}
			>
				<Table.Td ta="center">-</Table.Td>
				<Table.Td ta="center">{beer.name}</Table.Td>
				<Table.Td ta="center">{beer.style}</Table.Td>
				<Table.Td ta="center">{beer.breweryName}</Table.Td>
				<Table.Td ta="center">{addedByName}</Table.Td>
				<Table.Td ta="center" c="dimmed">
					-
				</Table.Td>
			</Table.Tr>
		);
	});

	const hasRatings = sessionProgress.ratedBeers.length > 0;
	const showTablePlaceholder =
		hasRatings && sessionProgress.ratedBeers.length < 4;

	return (
		<Box data-breakout mt="md">
			<MedalPodium entries={podiumEntries} users={sessionProgress.users} />

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

			{hasRatings && sessionStats && (
				<>
					<ResultsSection>
						<SessionStatsCard sessionStats={sessionStats} />
					</ResultsSection>

					<ResultsSection>
						<Table.ScrollContainer minWidth={0} type="native">
							<Table highlightOnHover={!showTablePlaceholder} striped>
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
									{unratedRows}
								</Table.Tbody>
							</Table>
						</Table.ScrollContainer>
					</ResultsSection>
				</>
			)}
		</Box>
	);
}
