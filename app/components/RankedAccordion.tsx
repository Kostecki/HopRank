import { Accordion, Box, Divider } from "@mantine/core";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

type InputProps<T> = {
	items: T[];
	getKey: (item: T) => number;
	renderCard: (item: T, rank: number) => ReactNode;
	renderPanel: (item: T) => ReactNode;
	compact?: boolean;
	// Whether a row belongs together with the one below it, with no gap between.
	isJoinedToNext?: (index: number) => boolean;
	// The last row above the divider. Defaults to third place.
	podiumEndIndex?: number;
	// Rows glide to their new place when the order changes, and fade in and out
	// when they're added or removed.
	animated?: boolean;
};

function Row({
	animated,
	children,
}: {
	animated: boolean;
	children: ReactNode;
}) {
	if (!animated) return <Box>{children}</Box>;

	return (
		<motion.div
			layout="position"
			transition={{ type: "spring", stiffness: 260, damping: 30 }}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
		>
			{children}
		</motion.div>
	);
}

export default function RankedAccordion<T>({
	items,
	getKey,
	renderCard,
	renderPanel,
	compact = false,
	isJoinedToNext,
	podiumEndIndex = 2,
	animated = false,
}: InputProps<T>) {
	const rowGap = compact ? "4px" : "8px";
	const podiumGap = compact ? "12px" : "30px";

	const rows = items.flatMap((item, index) => {
		const key = getKey(item);
		const isPodiumEnd = index === podiumEndIndex;
		// Overlaps the two borders, so they read as a single line.
		const nextRowGap = isJoinedToNext?.(index) ? "-1px" : rowGap;

		const row = (
			<Row key={key} animated={animated}>
				<Accordion.Item
					value={key.toString()}
					m={0}
					mb={isPodiumEnd ? podiumGap : nextRowGap}
				>
					<Accordion.Control
						style={{
							background: "none",
							border: "none",
							padding: 0,
							margin: 0,
							width: "100%",
							cursor: "pointer",
							userSelect: "none",
						}}
					>
						{renderCard(item, index + 1)}
					</Accordion.Control>

					<Accordion.Panel>{renderPanel(item)}</Accordion.Panel>
				</Accordion.Item>
			</Row>
		);

		if (!isPodiumEnd) return [row];

		// A sibling of the rows, so it stays put rather than travelling with
		// whichever bar is there.
		return [
			row,
			<Row key="podium-divider" animated={animated}>
				<Divider my={podiumGap} opacity={0.5} />
			</Row>,
		];
	});

	return (
		<Accordion unstyled chevron={null}>
			{animated ? (
				// Respects the device's "reduce motion" setting.
				<MotionConfig reducedMotion="user">
					{/* initial={false}: no fade-in for rows already there on page load. */}
					<AnimatePresence initial={false}>{rows}</AnimatePresence>
				</MotionConfig>
			) : (
				rows
			)}
		</Accordion>
	);
}
