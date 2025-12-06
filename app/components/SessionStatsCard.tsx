import {
	Box,
	type BoxProps,
	Card,
	Divider,
	Flex,
	SimpleGrid,
	Text,
} from "@mantine/core";

import type { SessionStats } from "~/types/session";

import { displayABV, displayScore } from "~/utils/utils";

import AnimatedValue from "./AnimatedValue";

type InputProps = {
	sessionStats: SessionStats;
} & BoxProps;

export default function SessionStatsCard({
	sessionStats,
	...props
}: InputProps) {
	const { lowestRaters, highestRaters, averageABV, averageRating, styleStats } =
		sessionStats;

	return (
		<Box {...props}>
			<Card shadow="xs" radius="md" mt="xl">
				<SimpleGrid cols={3}>
					<Flex justify="space-around" direction="column" h="100%">
						<Box>
							<Text ta="center" fw="bold" size="xl">
								Topscorer
							</Text>
							<Text ta="center" size="md" c="dimmed" fs="italic" mt={-7}>
								Højeste gennemsnit
							</Text>
							{highestRaters.map((rater) => {
								const compositeKey = `${rater.userId}-${rater.avgScore}`;

								return (
									<AnimatedValue
										key={compositeKey}
										value={compositeKey}
										ta="center"
										size="xl"
									>
										{rater.name} ({displayScore(rater.avgScore)})
									</AnimatedValue>
								);
							})}
						</Box>
						<Divider opacity={0.5} my="md" />
						<Box>
							<Text ta="center" fw="bold" size="xl">
								Bundscorer
							</Text>
							<Text ta="center" size="md" c="dimmed" fs="italic" mt={-7}>
								Laveste gennemsnit
							</Text>
							{lowestRaters.map((rater) => {
								const compositeKey = `${rater.userId}-${rater.avgScore}`;

								return (
									<AnimatedValue
										key={compositeKey}
										value={compositeKey}
										ta="center"
										size="xl"
									>
										{rater.name} ({displayScore(rater.avgScore)})
									</AnimatedValue>
								);
							})}
						</Box>
					</Flex>
					<Flex justify="space-around" direction="column" h="100%">
						<Box>
							<Text ta="center" fw="bold" size="xl">
								Score
							</Text>
							<Text ta="center" size="md" c="dimmed" fs="italic" mt={-7}>
								Gennemsnit
							</Text>
							<AnimatedValue value={averageRating} ta="center" size="xl">
								{displayScore(averageRating)}
							</AnimatedValue>
						</Box>
						<Divider opacity={0.5} my="md" />
						<Box>
							<Text ta="center" fw="bold" size="xl">
								Procenter
							</Text>
							<Text ta="center" size="md" c="dimmed" fs="italic" mt={-7}>
								Gennemsnit
							</Text>
							<AnimatedValue value={averageABV} ta="center" size="xl">
								{displayABV(averageABV)}
							</AnimatedValue>
						</Box>
					</Flex>
					<Flex justify="space-around" direction="column" h="100%">
						<Box>
							<Text ta="center" fw="bold" size="xl">
								Unikke Stiltyper
							</Text>
							<Text ta="center" size="md" c="dimmed" fs="italic" mt={-7}>
								Total
							</Text>
							<AnimatedValue
								value={styleStats.uniqueCount}
								ta="center"
								size="xl"
							>
								{styleStats.uniqueCount}
							</AnimatedValue>
						</Box>
						<Divider opacity={0.5} my="md" />
						<Box>
							<Text ta="center" fw="bold" size="xl">
								Mest Populære
							</Text>
							<Text ta="center" size="md" c="dimmed" fs="italic" mt={-7}>
								Stiltype
							</Text>
							<AnimatedValue
								value={styleStats.mostPopular?.style || "N/A"}
								ta="center"
								size="xl"
							>
								{styleStats.mostPopular
									? `${styleStats.mostPopular.style}`
									: "N/A"}
							</AnimatedValue>
						</Box>
					</Flex>
				</SimpleGrid>
			</Card>
		</Box>
	);
}
