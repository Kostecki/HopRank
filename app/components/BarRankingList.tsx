import { Box, Button, Divider, Flex, Paper, Text } from "@mantine/core";
import { Reorder, useDragControls } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";

import type { SessionBar } from "~/types/oneBeer";

import { useFetcherResult } from "~/hooks/useFetcherResult";
import {
	getRankedBarIds,
	getRowPlacements,
	isValidArrangement,
	mergeBarOrder,
	RANKING_START,
	withWaitingArea,
} from "~/utils/oneBeerRanking";

import BarDragHandle, { noTextSelection } from "./BarDragHandle";

type InputProps = {
	sessionId: number;
	bars: SessionBar[];
	// The open bar the person hasn't placed yet.
	newBarId: number | null;
	onSaved?: () => void;
};

type RowProps = {
	bar: SessionBar;
	row: number;
	isNew: boolean;
	onDragStart?: () => void;
};

function BarRow({ bar, row, isNew, onDragStart }: RowProps) {
	const dragControls = useDragControls();

	return (
		<Reorder.Item
			as="div"
			value={bar.id}
			dragListener={false}
			dragControls={dragControls}
			layout="position"
			onDragStart={onDragStart}
			style={{
				gridColumn: 2,
				gridRow: row,
				minWidth: 0,
				...noTextSelection,
			}}
		>
			<Paper
				withBorder
				radius="md"
				py={2}
				pl="sm"
				pr={0}
				bd={isNew ? "1px solid var(--mantine-color-slateIndigo-5)" : undefined}
			>
				<Flex align="center" justify="space-between">
					<Text fw={isNew ? "bold" : undefined}>{bar.name}</Text>

					<BarDragHandle
						label={`Flyt ${bar.name}`}
						dragControls={dragControls}
					/>
				</Flex>
			</Paper>
		</Reorder.Item>
	);
}

export default function BarRankingList({
	sessionId,
	bars,
	newBarId,
	onSaved,
}: InputProps) {
	const barIdsKey = bars.map((bar) => bar.id).join(",");
	const serverOrder = useMemo(
		() => (barIdsKey ? barIdsKey.split(",").map(Number) : []),
		[barIdsKey],
	);

	const [draggedNewBarId, setDraggedNewBarId] = useState<number | null>(null);

	// Once the new bar is picked up it's in the ranking for good, so there's a
	// decision to make. With nothing else on the list, it's number 1 already.
	const hasWaitingArea =
		newBarId !== null && newBarId !== draggedNewBarId && bars.length > 1;

	const [order, setOrder] = useState(() =>
		hasWaitingArea ? withWaitingArea(serverOrder, newBarId) : serverOrder,
	);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	const fetcher = useFetcher();
	const { revalidate } = useRevalidator();

	// Other people's actions refresh the page, so unsaved work has to survive
	// a new list from the server.
	useEffect(() => {
		setOrder((current) => {
			if (!hasUnsavedChanges) {
				return hasWaitingArea
					? withWaitingArea(serverOrder, newBarId)
					: serverOrder;
			}

			const target = hasWaitingArea
				? [...serverOrder, RANKING_START]
				: serverOrder;
			const merged = mergeBarOrder(current, target);

			// A new bar opened while someone was mid-change: it starts out waiting.
			return hasWaitingArea && !current.includes(RANKING_START)
				? withWaitingArea(merged, newBarId)
				: merged;
		});
	}, [serverOrder, hasUnsavedChanges, hasWaitingArea, newBarId]);

	const { state } = fetcher;

	useFetcherResult(fetcher, {
		errorMessage: "Kunne ikke gemme rangeringen",
		onSuccess: () => {
			setHasUnsavedChanges(false);
			onSaved?.();
		},
		onError: () => revalidate(),
	});

	const handleSave = () => {
		const formData = new FormData();
		formData.append("barIds", JSON.stringify(getRankedBarIds(order)));

		fetcher.submit(formData, {
			method: "POST",
			action: `/api/sessions/${sessionId}/placements`,
		});
	};

	const barsById = new Map(bars.map((bar) => [bar.id, bar]));
	const placements = getRowPlacements(order);
	const isWaiting = hasWaitingArea && order[0] === newBarId;

	return (
		<>
			{isWaiting && (
				<Text size="sm" c="dimmed" fs="italic" mb="xs">
					Træk den nye bar ned på din rangering
				</Text>
			)}

			{/* A grid so the placement numbers stay put while the bars move next to
			    them, and each number still lines up with a row of any height. */}
			<Reorder.Group
				as="div"
				axis="y"
				values={order}
				onReorder={(newOrder) => {
					if (!isValidArrangement(newOrder, newBarId)) return;

					setOrder(newOrder);
					setHasUnsavedChanges(true);
				}}
				style={{
					display: "grid",
					gridTemplateColumns: "auto minmax(0, 1fr)",
					columnGap: 12,
					rowGap: 4,
					alignItems: "center",
				}}
			>
				{placements.map((placement, index) => {
					const row = index + 1;

					return (
						<Text
							key={row}
							fw="bold"
							ta="center"
							style={{ gridColumn: 1, gridRow: row }}
						>
							{placement}
						</Text>
					);
				})}

				{order.map((barId, index) => {
					if (barId === RANKING_START) {
						return (
							<Reorder.Item
								as="div"
								key={barId}
								value={barId}
								dragListener={false}
								layout="position"
								style={{ gridColumn: "1 / -1", gridRow: index + 1 }}
							>
								<Divider my="xs" />
							</Reorder.Item>
						);
					}

					const bar = barsById.get(barId);
					if (!bar) return null;

					return (
						<BarRow
							key={barId}
							bar={bar}
							row={index + 1}
							isNew={barId === newBarId}
							onDragStart={
								barId === newBarId
									? () => {
											setDraggedNewBarId(barId);
											setHasUnsavedChanges(true);
											setOrder((current) =>
												current.filter((id) => id !== RANKING_START),
											);
										}
									: undefined
							}
						/>
					);
				})}
			</Reorder.Group>

			{/* Stays in view however long the list gets. */}
			<Box
				pos="sticky"
				bottom={0}
				bg="var(--mantine-color-body)"
				mt="xs"
				py="xs"
				style={{ zIndex: 1 }}
			>
				<Button
					color="slateIndigo"
					tt="uppercase"
					fw="bold"
					lts={0.8}
					fullWidth
					onClick={handleSave}
					loading={state !== "idle"}
					disabled={isWaiting || (!hasUnsavedChanges && newBarId === null)}
				>
					Gem rangering
				</Button>
			</Box>
		</>
	);
}
