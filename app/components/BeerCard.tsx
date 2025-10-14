import {
	Box,
	Card,
	Flex,
	Grid,
	Image,
	RingProgress,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { displayScore } from "~/utils/utils";

import type { RatedBeers, SessionProgress } from "~/types/session";

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

	const RenderScore = () => {
		return (
			<Title size={30} fw={600} lineClamp={1} ta="center">
				{displayScore(beer?.averageScore)}
			</Title>
		);
	};

	const RenderProgress = () => {
		if (!session || !session.users.length) return null;

		if (!session.currentBeer) return null;
		const { currentVoteCount, totalPossibleVoteCount } = session.currentBeer;

		const progress = (currentVoteCount / totalPossibleVoteCount) * 100;

		return (
			<RingProgress
				size={70}
				thickness={6}
				label={
					<Text
						size="xs"
						ta="center"
						fw="600"
						style={{ pointerEvents: "none" }}
					>
						{`${currentVoteCount}/${totalPossibleVoteCount}`}
					</Text>
				}
				sections={[
					{
						value: progress,
						color: "slateIndigo",
					},
				]}
			/>
		);
	};

	return (
		<Card
			shadow="sm"
			pos="relative"
			p="xs"
			style={{
				...(getMedalColor()
					? { borderBottom: `8px solid ${getMedalColor()}` }
					: {}),
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
							{name}
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
						{isRatedBeer ? <RenderScore /> : <RenderProgress />}
					</Flex>
				</Grid.Col>
			</Grid>

			<RenderHadAlreadyHad />
		</Card>
	);
}
