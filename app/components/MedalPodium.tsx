import { Carousel } from "@mantine/carousel";
import {
	Avatar,
	Box,
	Card,
	Flex,
	type FlexProps,
	Image,
	rem,
	Stack,
	Text,
	ThemeIcon,
} from "@mantine/core";
import AutoPlay from "embla-carousel-autoplay";

import type { SessionProgressUser } from "~/types/session";

import { groupByAverageScore, type ScoreGroup } from "~/utils/podium";
import { displayScore } from "~/utils/utils";

export type PodiumEntry = {
	id: number;
	label?: string;
	title: string;
	subtitle?: string;
	averageScore: number;
	// Shown instead of the score, for modes where the score says nothing the
	// podium doesn't already show.
	note?: string;
	addedByUserId: number | null;
	// Opened in a new tab when the entry is clicked.
	href?: string;
};

type inputProps = {
	entries: PodiumEntry[];
	users: SessionProgressUser[];
	// Shorter columns, for entries with no image.
	compact?: boolean;
};

// Colors for 1st, 2nd, 3rd place: Gold, Silver, Bronze
// Ordered by podium display order: 2nd, 1st, 3rd
const placementColors = ["#BFC9D6", "#E9C46A", "#C0893A"];

export default function MedalPodium({
	entries,
	users,
	compact = false,
}: inputProps) {
	// heights for podium positions in display order: 2nd, 1st, 3rd
	const heights = compact
		? [rem(120), rem(145), rem(120)]
		: [rem(285), rem(310), rem(285)];

	const rankedGroups = groupByAverageScore(entries);
	const podiumSource = rankedGroups.slice(0, 3);

	const podiumGroups: Array<ScoreGroup<PodiumEntry> | null> = [
		podiumSource[1] ?? null,
		podiumSource[0] ?? null,
		podiumSource[2] ?? null,
	];

	const renderPodiumEntry = (
		entry: PodiumEntry,
		place: number,
		bg: string,
		height: string,
	) => {
		const addedByUser = users.find((u) => u.id === entry.addedByUserId);

		return (
			<Flex
				direction="column"
				align="center"
				justify={
					compact ? "center" : place === 1 ? "space-between" : "flex-end"
				}
				pos="relative"
				h={height}
				w="100%"
				bdrs="md"
				pt="lg"
				pb="sm"
				bg={`linear-gradient(180deg, ${bg} 0%, rgba(0,0,0,0.08) 100%)`}
				style={{
					boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
					overflow: "hidden",
					cursor: entry.href ? "pointer" : undefined,
				}}
				onClick={() => {
					if (entry.href) window.open(entry.href, "_blank");
				}}
			>
				{addedByUser && (
					<Avatar
						src={addedByUser.avatarURL}
						name={addedByUser.name ?? addedByUser.username ?? undefined}
						color="initials"
						size={32}
						pos="absolute"
						top={8}
						right={8}
						style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }}
					/>
				)}
				{entry.label && (
					<Card withBorder shadow="sm" p="xs" radius="md" mb="sm" bg="white">
						<Image
							src={entry.label}
							alt={entry.title}
							fit="contain"
							maw={rem(100)}
						/>
					</Card>
				)}
				<Box ta="center">
					{entry.subtitle && (
						<Text size="lg" c="gray.7">
							{entry.subtitle}
						</Text>
					)}

					<Text size="xl" mt={3} fw={700} ta="center">
						{entry.title}
					</Text>

					{entry.note ? (
						<Text size="sm" mt={5} c="gray.7" fs="italic">
							{entry.note}
						</Text>
					) : (
						<Text size="lg" fw={700} mt={5} c="dimmed" fs="italic" mb="lg">
							{displayScore(entry.averageScore)}
						</Text>
					)}
				</Box>
			</Flex>
		);
	};

	const renderEmptyPedestal = (place: number, bg: string, height: string) => (
		<Flex
			direction="column"
			justify="center"
			align="center"
			gap={6}
			h={height}
			w="100%"
			bdrs="md"
			bg={`linear-gradient(180deg, ${bg} 0%, rgba(0,0,0,0.08) 100%)`}
			pt="lg"
			pb="sm"
			style={{
				boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
				overflow: "hidden",
				backdropFilter: "blur(2px)",
			}}
		>
			<ThemeIcon size={46} radius="xl" variant="light" color="gray">
				<Text fw={700} size="lg">
					{place}
				</Text>
			</ThemeIcon>
		</Flex>
	);

	const renderColumn = (
		group: ScoreGroup<PodiumEntry> | null,
		i: number,
		size: FlexProps,
	) => {
		const place = i === 1 ? 1 : i === 0 ? 2 : 3;
		const bg = placementColors[i];
		const height = heights[i] || rem(120);

		return (
			<Flex direction="column" align="center" key={place} {...size}>
				{group ? (
					group.entries.length > 1 ? (
						<Carousel
							withIndicators
							withControls={false}
							slideSize="100%"
							slideGap="md"
							maw="100%"
							styles={{
								indicator: {
									width: 7,
									height: 7,
								},
								control: {
									backgroundColor: "unset",
									border: "unset",
									boxShadow: "unset",
								},
							}}
							style={{ width: "100%" }}
							emblaOptions={{
								loop: true,
								duration: 60,
							}}
							plugins={[
								AutoPlay({
									delay: 10000,
									stopOnMouseEnter: true,
									stopOnInteraction: false,
								}),
							]}
						>
							{group.entries.map((entry) => (
								<Carousel.Slide key={entry.id}>
									{renderPodiumEntry(entry, place, bg, height)}
								</Carousel.Slide>
							))}
						</Carousel>
					) : (
						renderPodiumEntry(group.entries[0], place, bg, height)
					)
				) : (
					renderEmptyPedestal(place, bg, height)
				)}
			</Flex>
		);
	};

	// Two layouts rather than a media query in JS, so the server's HTML is already
	// right. Empty spots are left out of the stack, where they'd only take up room.
	return (
		<>
			<Flex
				visibleFrom="sm"
				justify="center"
				align="flex-end"
				gap="xl"
				aria-label="Podium"
			>
				{podiumGroups.map((group, i) =>
					renderColumn(group, i, { flex: 1, miw: 0 }),
				)}
			</Flex>

			<Stack hiddenFrom="sm" gap="sm" aria-label="Podium">
				{[1, 0, 2].map((i) =>
					podiumGroups[i]
						? renderColumn(podiumGroups[i], i, { w: "100%" })
						: null,
				)}
			</Stack>
		</>
	);
}
