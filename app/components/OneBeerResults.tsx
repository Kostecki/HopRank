import {
	Avatar,
	Box,
	Card,
	Flex,
	Group,
	Paper,
	SimpleGrid,
	Table,
	type TableTdProps,
	Text,
	Tooltip,
} from "@mantine/core";
import type { ReactNode } from "react";

import type { OneBeerRanking, RankedBar } from "~/types/oneBeer";
import type { SessionProgressUser } from "~/types/session";

import { findAgreement } from "~/utils/oneBeerRanking";
import { groupByAverageScore } from "~/utils/podium";
import { sortByDisplayName } from "~/utils/utils";

import BeerHeader from "./BeerHeader";
import MedalPodium from "./MedalPodium";
import ResultsSection from "./ResultsSection";

type InputProps = {
	users: SessionProgressUser[];
	ranking: OneBeerRanking;
};

const podiumNote = (bar: RankedBar) =>
	bar.firstPlaceCount > 0
		? `Nr. 1 hos ${bar.firstPlaceCount} af ${bar.placedByCount}`
		: `Bedste placering: ${bar.bestPosition}.`;

const placementRange = (bar: RankedBar) =>
	bar.bestPosition === bar.worstPosition
		? `${bar.bestPosition}.`
		: `${bar.bestPosition}.–${bar.worstPosition}.`;

// Keeps the bar names in view while the people scroll sideways on a phone.
const stickyColumn = {
	position: "sticky",
	left: 0,
	zIndex: 1,
	background: "var(--mantine-color-body)",
	boxShadow: "inset -1px 0 0 var(--mantine-color-gray-3)",
} as const;

// Set on what's inside the cells, because browsers can ignore a minimum width on
// a table cell. Without these, the columns squeeze together instead of scrolling.
const BAR_COLUMN_WIDTH = 140;
const PERSON_COLUMN_WIDTH = 44;

function BarCell({
	children,
	...props
}: { children: ReactNode } & TableTdProps) {
	return (
		<Table.Td style={stickyColumn} {...props}>
			<Box w={BAR_COLUMN_WIDTH}>{children}</Box>
		</Table.Td>
	);
}

function ParticipantAvatar({ user }: { user: SessionProgressUser }) {
	const name = user.name ?? user.username ?? "Deltager";

	return (
		<Tooltip label={name} events={{ hover: true, focus: true, touch: true }}>
			<Avatar
				src={user.avatarURL}
				name={name}
				color="initials"
				size="sm"
				mx="auto"
				opacity={user.status === "active" ? 1 : 0.5}
			/>
		</Tooltip>
	);
}

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function PlacementCell({
	position,
	isGone = false,
}: {
	position?: number;
	isGone?: boolean;
}) {
	return (
		<Table.Td ta="center" c={isGone || !position ? "dimmed" : undefined}>
			<Box miw={PERSON_COLUMN_WIDTH}>
				{(position && MEDALS[position]) ?? position ?? "-"}
			</Box>
		</Table.Td>
	);
}

function AgreementStat({
	title,
	description,
	bar,
}: {
	title: string;
	description: string;
	bar: RankedBar;
}) {
	return (
		<Box>
			<Text ta="center" fw="bold" size="xl">
				{title}
			</Text>
			<Text ta="center" size="md" c="dimmed" fs="italic" mt={-7}>
				{description}
			</Text>
			<Text ta="center" size="xl">
				{bar.name}
			</Text>
			<Text ta="center" size="sm" c="dimmed">
				{placementRange(bar)} plads
			</Text>
		</Box>
	);
}

export default function OneBeerResults({ users, ranking }: InputProps) {
	const { beer, rankedBars, currentBar, queuedBars, personalPlacements } =
		ranking;

	const entries = rankedBars.map((bar) => ({
		id: bar.id,
		title: bar.name,
		averageScore: bar.averagePosition,
		note: podiumNote(bar),
		addedByUserId: null,
		bar,
	}));

	const groups = groupByAverageScore(entries);
	const hasRankedBars = entries.length > 0;
	const agreement = findAgreement(rankedBars);

	const rankedRows = groups.flatMap((group, index) =>
		group.entries.map(({ bar }) => ({ bar, rank: index + 1 })),
	);

	// Bars that never finished, e.g. because the session ended before everyone
	// had placed them.
	const unrankedBars = [...(currentBar ? [currentBar] : []), ...queuedBars];

	const participants = sortByDisplayName(users).flatMap((user) => {
		const placements = personalPlacements.find((p) => p.userId === user.id);
		return placements ? [{ user, positions: placements.positions }] : [];
	});

	return (
		<Box data-breakout mt="md">
			{beer && (
				<ResultsSection mt={0}>
					<BeerHeader beer={beer} />
				</ResultsSection>
			)}

			<Box my={40}>
				<MedalPodium compact entries={entries} users={users} />
			</Box>

			{!hasRankedBars && (
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
								Ingen rangerede barer endnu
							</Text>
						</Group>
						<Text size="sm" c="gray.7" mb="md">
							Når en bar er færdigrangeret vises den her - og podiet kan begynde
							at tage form.
						</Text>
						<Group mb="xs" gap="xs">
							<Text size="xs" c="dimmed">
								{unrankedBars.length} barer tilføjet
							</Text>
							<Text size="xs" c="dimmed">
								•
							</Text>
							<Text size="xs" c="dimmed">
								Deltagere: {users.length}
							</Text>
						</Group>
					</Paper>
				</Flex>
			)}

			{agreement && (
				<ResultsSection>
					<Card shadow="xs" radius="md">
						<SimpleGrid cols={2}>
							<AgreementStat
								title="Mest enige"
								description="Tættest placeret"
								bar={agreement.mostAgreed}
							/>
							<AgreementStat
								title="Mest uenige"
								description="Størst spænd"
								bar={agreement.mostDisagreed}
							/>
						</SimpleGrid>
					</Card>
				</ResultsSection>
			)}

			{hasRankedBars && (
				<ResultsSection>
					<Table.ScrollContainer minWidth={0} type="native">
						<Table>
							<Table.Thead>
								<Table.Tr>
									<Table.Th style={stickyColumn}>
										<Box w={BAR_COLUMN_WIDTH}>Bar</Box>
									</Table.Th>
									{participants.map(({ user }) => (
										<Table.Th key={user.id}>
											<ParticipantAvatar user={user} />
										</Table.Th>
									))}
								</Table.Tr>
							</Table.Thead>
							<Table.Tbody>
								{rankedRows.map(({ bar, rank }) => (
									<Table.Tr key={bar.id}>
										<BarCell fw={500}>
											{rank}. {bar.name}
										</BarCell>
										{participants.map(({ user, positions }) => (
											<PlacementCell
												key={user.id}
												position={positions[bar.id]}
												isGone={user.status !== "active"}
											/>
										))}
									</Table.Tr>
								))}

								{unrankedBars.map((bar) => (
									<Table.Tr key={bar.id}>
										<BarCell c="dimmed">{bar.name}</BarCell>
										{participants.map(({ user }) => (
											<PlacementCell key={user.id} isGone />
										))}
									</Table.Tr>
								))}
							</Table.Tbody>
						</Table>
					</Table.ScrollContainer>
				</ResultsSection>
			)}
		</Box>
	);
}
