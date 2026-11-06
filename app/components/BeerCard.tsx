import { Box } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import type { RatedBeers, SessionProgress } from "~/types/session";

import { RankCard, RankCardValue } from "./RankCard";
import VoteProgress from "./VoteProgress";

type InputProps = {
	session: SessionProgress;
	beer?: RatedBeers;
	rank?: number;
};

const green = "#6EBC48";

export function BeerCard({ session, beer, rank }: InputProps) {
	const isRatedBeer = !!beer;

	const { beerId, label, name, breweryName, style } =
		beer || session.currentBeer || {};

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

	return (
		<RankCard
			image={label}
			title={name}
			subtitle={breweryName}
			detail={style}
			rank={rank}
			aside={
				isRatedBeer ? (
					<RankCardValue value={beer?.averageScore} />
				) : (
					<VoteProgress
						current={session.currentBeer?.currentVoteCount}
						total={session.currentBeer?.totalPossibleVoteCount}
					/>
				)
			}
		>
			<RenderHadAlreadyHad />
		</RankCard>
	);
}
