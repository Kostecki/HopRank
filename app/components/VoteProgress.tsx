import { RingProgress, Text } from "@mantine/core";
import { useEffect, useState } from "react";

type InputProps = {
	current?: number;
	total?: number;
};

export default function VoteProgress({ current, total }: InputProps) {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (current === undefined || total === undefined) return;

		setProgress((current / total) * 100);
	}, [current, total]);

	return (
		<RingProgress
			size={70}
			thickness={6}
			label={
				<Text size="xs" ta="center" fw="600" style={{ pointerEvents: "none" }}>
					{`${current}/${total}`}
				</Text>
			}
			sections={[{ value: progress, color: "slateIndigo" }]}
			transitionDuration={250}
		/>
	);
}
