import { RingProgress, Text } from "@mantine/core";
import { useEffect, useState } from "react";

import type { SessionProgress } from "~/types/session";

type InputProps = {
	session: SessionProgress;
};

export default function VoteProgress({ session }: InputProps) {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (!session.currentBeer) return;
		const { currentVoteCount, totalPossibleVoteCount } = session.currentBeer;
		const progress = (currentVoteCount / totalPossibleVoteCount) * 100;

		setProgress(progress);
	}, [session.currentBeer]);

	return (
		<RingProgress
			size={70}
			thickness={6}
			label={
				<Text size="xs" ta="center" fw="600" style={{ pointerEvents: "none" }}>
					{`${session.currentBeer?.currentVoteCount}/${session.currentBeer?.totalPossibleVoteCount}`}
				</Text>
			}
			sections={[{ value: progress, color: "slateIndigo" }]}
			transitionDuration={250}
		/>
	);
}
