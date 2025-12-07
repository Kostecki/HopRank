import {
	Box,
	Card,
	Flex,
	Grid,
	Image,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import type { RatedBeers, SessionProgress } from "~/types/session";

import { displayScore } from "~/utils/utils";

import VoteProgress from "./VoteProgress";

type InputProps = {
	session: SessionProgress;
	beer?: RatedBeers;
	rank?: number;
};

const gold = "#ffd700";
const silver = "#c0c0c0";
const bronze = "#8c6239";
const green = "#6EBC48";

export function BeerCard({ session, beer, rank }: InputProps) {
	const isRatedBeer = !!beer;

	const { beerId, label, name, breweryName, style } =
		beer || session.currentBeer || {};

	const isPodiumBeer = !!(rank && rank <= 3);

	const getMedalColor = () => {
		if (!rank || rank > 3) return null;

		return [gold, silver, bronze][rank - 1];
	};

	const RenderHadAlreadyHad = () => {
		if (
			session.currentBeer &&
			session.currentBeer.beerId === beerId &&
			session.currentBeer.userHadBeer
		) {
			return (
				<Box
					style={{
						position: "absolute",
						top: 0,
						right: 0,
						background: green,
						width: 28,
						height: 28,
						clipPath: "polygon(100% 0, 100% 100%, 0 0)",
						display: "flex",
						justifyContent: "flex-end",
						alignItems: "flex-start",
						padding: 2.5,
					}}
				>
					<IconCheck color="white" size={12} stroke={3.5} />
				</Box>
			);
		}
	};

	const RenderScore = () => (
		<Title size={30} fw={600} lineClamp={1} ta="center">
			{displayScore(beer?.averageScore)}
		</Title>
	);

	return (
		<Card
			shadow="sm"
			pos="relative"
			p="xs"
			style={{
				...(getMedalColor()
					? {
							borderLeft: `8px solid ${getMedalColor()}`,
						}
					: {
							borderLeft: "8px solid transparent",
						}),
				zIndex: 10,
			}}
			withBorder
		>
			<Grid justify="space-between" align="center">
				<Grid.Col span={3} p="sm">
					<Image src={label} alt={name} radius="md" mah={65} w="auto" />
				</Grid.Col>
				<Grid.Col span={6}>
					<Stack gap={0}>
						<Text size="md" ta="center" fw="bold" lineClamp={1}>
							{isPodiumBeer || rank == null ? name : `${rank} - ${name}`}
						</Text>
						<Text size="sm" ta="center" fs="italic" lineClamp={1}>
							{breweryName}
						</Text>
						<Text size="sm" ta="center" lineClamp={1}>
							{style}
						</Text>
					</Stack>
				</Grid.Col>
				<Grid.Col span={3}>
					<Flex justify="center">
						{isRatedBeer ? <RenderScore /> : <VoteProgress session={session} />}
					</Flex>
				</Grid.Col>
			</Grid>

			<RenderHadAlreadyHad />
		</Card>
	);
}
