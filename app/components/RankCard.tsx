import { Card, Flex, Grid, Image, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

import { displayScore } from "~/utils/utils";

type InputProps = {
	image?: string;
	title?: string;
	subtitle?: ReactNode;
	detail?: string;
	rank?: number;
	// One line of text and a small image, for lists of many similar rows.
	compact?: boolean;
	// Squares off the corners that touch a neighbouring card with the same rank.
	joinedAbove?: boolean;
	joinedBelow?: boolean;
	// Shown in the column on the right: a score or a progress ring.
	aside?: ReactNode;
	children?: ReactNode;
};

const gold = "#ffd700";
const silver = "#c0c0c0";
const bronze = "#8c6239";

export function RankCardValue({ value }: { value?: number }) {
	return (
		<Title size={30} fw={600} lineClamp={1} ta="center">
			{displayScore(value)}
		</Title>
	);
}

export function RankCard({
	image,
	title,
	subtitle,
	detail,
	rank,
	compact = false,
	joinedAbove = false,
	joinedBelow = false,
	aside,
	children,
}: InputProps) {
	const isPodium = !!(rank && rank <= 3);
	const medalColor = rank && isPodium ? [gold, silver, bronze][rank - 1] : null;

	return (
		<Card
			shadow="sm"
			pos="relative"
			p={compact ? 4 : "xs"}
			style={{
				borderLeft: `8px solid ${medalColor ?? "transparent"}`,
				zIndex: 10,
				...(joinedAbove && { borderTopLeftRadius: 0, borderTopRightRadius: 0 }),
				...(joinedBelow && {
					borderBottomLeftRadius: 0,
					borderBottomRightRadius: 0,
				}),
			}}
			withBorder
		>
			<Grid justify="space-between" align="center">
				{image && (
					<Grid.Col span={3} p={compact ? "xs" : "sm"}>
						<Image
							src={image}
							alt={title}
							radius="md"
							mah={compact ? 32 : 65}
							w="auto"
						/>
					</Grid.Col>
				)}
				<Grid.Col span={image ? 6 : "auto"} pl={image ? undefined : "md"}>
					<Stack gap={0}>
						<Text
							size="md"
							ta={image ? "center" : "left"}
							fw={image ? "bold" : 500}
							lineClamp={1}
						>
							{isPodium || rank == null || compact
								? title
								: `${rank} - ${title}`}
						</Text>
						{!compact && (
							<>
								<Text
									size="sm"
									ta={image ? "center" : "left"}
									fs="italic"
									lineClamp={1}
								>
									{subtitle}
								</Text>
								<Text size="sm" ta="center" lineClamp={1}>
									{detail}
								</Text>
							</>
						)}
					</Stack>
				</Grid.Col>
				{/* Without an image, the text takes the room and this hugs the edge. */}
				<Grid.Col span={image ? 3 : "content"} pr={image ? undefined : "md"}>
					<Flex justify="center">{aside}</Flex>
				</Grid.Col>
			</Grid>

			{children}
		</Card>
	);
}
