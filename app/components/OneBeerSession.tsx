import { Anchor, Box, Group, Paper, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import type { OneBeerRanking, SessionBarList } from "~/types/oneBeer";
import { type SessionProgress, SessionStatus } from "~/types/session";
import type { SessionUser } from "~/types/user";

import { groupByAverageScore } from "~/utils/podium";
import { formatBarAddress, getBarMapUrl } from "~/utils/oneBeerRanking";

import AddBarForm from "./AddBarForm";
import AddNextBarButton from "./AddNextBarButton";
import BarActions from "./BarActions";
import BarDetails from "./BarDetails";
import BeerHeader from "./BeerHeader";
import { RankCard } from "./RankCard";
import RankingButton from "./RankingButton";
import RankedAccordion from "./RankedAccordion";
import { StartSession } from "./StartSession";
import VoteProgress from "./VoteProgress";

type InputProps = {
	user: SessionUser;
	session: SessionProgress;
	ranking: OneBeerRanking;
	personalList: SessionBarList;
	canPlace: boolean;
};

export default function OneBeerSession({
	user,
	session,
	ranking,
	personalList,
	canPlace,
}: InputProps) {
	const { beer, rankedBars, currentBar, queuedBars } = ranking;

	if (session.status === SessionStatus.created) {
		const firstBar = queuedBars[0];

		return (
			<>
				{beer && <BeerHeader beer={beer} />}

				<StartSession user={user} session={session}>
					{firstBar ? (
						<Box>
							<Text fw="bold">Første bar: {firstBar.name}</Text>
							<BarActions user={user} session={session} bar={firstBar} />
						</Box>
					) : (
						canPlace && (
							<Box ta="left">
								<Text size="sm" c="dimmed" fs="italic">
									Du kan tilføje den første bar nu eller efter start
								</Text>
								<AddBarForm user={user} sessionId={session.sessionId} />
							</Box>
						)
					)}
				</StartSession>
			</>
		);
	}

	const hasBars = !!currentBar || rankedBars.length > 0;
	const currentBarMapUrl = currentBar && getBarMapUrl(currentBar);
	const needsToPlaceCurrent = !!currentBar && !personalList.hasPlacedCurrent;
	// Bars with the same average share a rank, as they do on the results page.
	const ranks = new Map(
		groupByAverageScore(
			rankedBars.map((bar) => ({
				id: bar.id,
				averageScore: bar.averagePosition,
			})),
		).flatMap((group, index) =>
			group.entries.map((entry) => [entry.id, index + 1] as const),
		),
	);
	const rankAt = (index: number) => ranks.get(rankedBars[index]?.id);
	const isTiedWithNext = (index: number) =>
		index + 1 < rankedBars.length && rankAt(index) === rankAt(index + 1);
	// The divider goes below the last medal bar, so it can't split a tie.
	const podiumEndIndex =
		rankedBars.filter((bar) => (ranks.get(bar.id) ?? 0) <= 3).length - 1;
	const personalPositions = new Map(
		personalList.bars.map((bar, index) => [bar.id, index + 1]),
	);

	return (
		<>
			{beer && <BeerHeader beer={beer} />}

			{currentBar ? (
				<Box mb="md">
					<RankCard
						title={currentBar.name}
						subtitle={
							currentBarMapUrl && (
								<Anchor
									href={currentBarMapUrl}
									target="_blank"
									size="sm"
									c="dimmed"
								>
									{formatBarAddress(currentBar) || "Åben i kort"}
								</Anchor>
							)
						}
						aside={
							<VoteProgress
								current={currentBar.placedCount}
								total={currentBar.expectedCount}
							/>
						}
					/>

					<Paper withBorder radius="md" p="sm" pt="lg" mt={-10}>
						{canPlace &&
							(needsToPlaceCurrent ? (
								<Text size="sm" fw="bold" ta="center">
									Tryk på knappen nederst for at rangere baren
								</Text>
							) : (
								<Group gap={6} justify="center" wrap="nowrap">
									<IconCheck color="#484F65" size={16} />
									<Text size="sm" c="dimmed">
										Din rangering er gemt
									</Text>
								</Group>
							))}

						{queuedBars.length > 0 && (
							<Text size="sm" c="dimmed" fs="italic" ta="center" mt="xs">
								Næste: {queuedBars[0].name}
							</Text>
						)}
					</Paper>
				</Box>
			) : (
				canPlace &&
				(hasBars ? (
					<AddNextBarButton user={user} sessionId={session.sessionId} />
				) : (
					<Paper p="md" radius="md" withBorder mt={64}>
						<Text fw="bold">Smagningen har ingen barer :(</Text>
						<Text c="dimmed" size="sm" fs="italic">
							Du kan tilføje den første bar herunder
						</Text>

						<AddBarForm user={user} sessionId={session.sessionId} />
					</Paper>
				))
			)}

			<RankedAccordion
				compact
				animated
				items={rankedBars}
				getKey={(bar) => bar.id}
				isJoinedToNext={isTiedWithNext}
				podiumEndIndex={podiumEndIndex}
				renderCard={(bar, position) => {
					const rank = ranks.get(bar.id);
					const index = position - 1;

					return (
						<RankCard
							title={bar.name}
							rank={rank}
							compact
							joinedAbove={index > 0 && isTiedWithNext(index - 1)}
							joinedBelow={isTiedWithNext(index)}
							aside={
								// Fixed width, so every number lines up whatever its digits.
								<Text
									size="xl"
									fw={500}
									ta="center"
									w={32}
									style={{ fontVariantNumeric: "tabular-nums" }}
								>
									{rank}
								</Text>
							}
						/>
					);
				}}
				renderPanel={(bar) => (
					<BarDetails
						user={user}
						session={session}
						bar={bar}
						position={personalPositions.get(bar.id)}
					/>
				)}
			/>

			{canPlace && personalList.bars.length > 0 && (
				<RankingButton
					sessionId={session.sessionId}
					bars={personalList.bars}
					newBarId={needsToPlaceCurrent ? currentBar.id : null}
				/>
			)}
		</>
	);
}
