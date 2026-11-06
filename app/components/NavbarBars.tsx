import {
	ActionIcon,
	Divider,
	Flex,
	Group,
	Paper,
	Stack,
	Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconPencil, IconPlus, IconX } from "@tabler/icons-react";
import { Reorder, useDragControls } from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";

import type { SessionBar } from "~/types/oneBeer";
import {
	SessionBeerStatus,
	type SessionProgress,
	SessionStatus,
} from "~/types/session";
import type { SessionUser } from "~/types/user";

import { useRemoveBar } from "~/hooks/useRemoveBar";
import { showDangerToast } from "~/utils/toasts";

import BarDragHandle, { noTextSelection } from "./BarDragHandle";
import { ModalAddBar, ModalCorrectBar } from "./modals/ModalBar";

type InputProps = {
	user: SessionUser;
	session: SessionProgress;
	bars: SessionBar[];
	onBarAdded?: () => void;
};

type BarRowProps = {
	bar: SessionBar;
	onEdit?: () => void;
	onRemove?: () => void;
	// Replaces the status icon, for the bars whose order can still change.
	handle?: ReactNode;
};

function BarAction({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<ActionIcon
			variant="subtle"
			color="gray"
			size="sm"
			aria-label={label}
			onClick={onClick}
		>
			{children}
		</ActionIcon>
	);
}

function BarRow({ bar, onEdit, onRemove, handle }: BarRowProps) {
	const isFinished = bar.status === SessionBeerStatus.rated;
	const isCurrent = bar.status === SessionBeerStatus.rating;

	return (
		<Paper withBorder radius="md" py={4} pl={2} pr={6}>
			<Flex align="center" gap={2}>
				{/* The same slot on every row, so all the names line up. */}
				<Flex w={24} justify="center" style={{ flexShrink: 0 }}>
					{handle ?? (isFinished && <IconCheck color="#868e96" size={14} />)}
				</Flex>

				<Text
					size="sm"
					fw={isCurrent ? "bold" : 500}
					c={isFinished ? "dimmed" : undefined}
					style={{ flex: 1, minWidth: 0 }}
				>
					{bar.name}
				</Text>

				{onEdit && (
					<BarAction label={`Ret ${bar.name}`} onClick={onEdit}>
						<IconPencil size={14} stroke={1.5} />
					</BarAction>
				)}
				{onRemove && (
					<BarAction label={`Fjern ${bar.name}`} onClick={onRemove}>
						<IconX size={14} stroke={1.5} />
					</BarAction>
				)}
			</Flex>
		</Paper>
	);
}

function UpcomingBarRow({
	bar,
	onDragStart,
	onDragEnd,
	...rowProps
}: Omit<BarRowProps, "handle"> & {
	onDragStart: () => void;
	onDragEnd: () => void;
}) {
	const dragControls = useDragControls();

	return (
		<Reorder.Item
			as="div"
			value={bar.id}
			dragListener={false}
			dragControls={dragControls}
			layout="position"
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			style={noTextSelection}
		>
			<BarRow
				bar={bar}
				{...rowProps}
				handle={
					<BarDragHandle
						compact
						label={`Flyt ${bar.name}`}
						dragControls={dragControls}
					/>
				}
			/>
		</Reorder.Item>
	);
}

/** Every bar in the session, shared by everyone: done, open and coming up. */
export default function NavbarBars({
	user,
	session,
	bars,
	onBarAdded,
}: InputProps) {
	const { sessionId } = session;

	const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
	const [editingBarId, setEditingBarId] = useState<number | null>(null);
	const { removeBar } = useRemoveBar(sessionId);

	const isRunning = session.status === SessionStatus.active;
	const hasToken = !!user.untappd?.accessToken;
	const isOwner = user.admin || session.createdBy === user.id;

	const finishedBars = bars.filter(
		(bar) => bar.status === SessionBeerStatus.rated,
	);
	const currentBars = bars.filter(
		(bar) => bar.status === SessionBeerStatus.rating,
	);
	const upcomingBars = bars.filter(
		(bar) => bar.status === SessionBeerStatus.waiting,
	);

	const upcomingKey = upcomingBars.map((bar) => bar.id).join(",");
	const serverOrder = useMemo(
		() => (upcomingKey ? upcomingKey.split(",").map(Number) : []),
		[upcomingKey],
	);

	const [order, setOrder] = useState(serverOrder);
	const isDragging = useRef(false);

	const fetcher = useFetcher();
	const { revalidate } = useRevalidator();

	// Other people change this list too. Their changes apply straight away,
	// unless a bar is being dragged right now.
	useEffect(() => {
		if (!isDragging.current) setOrder(serverOrder);
	}, [serverOrder]);

	const { data, state } = fetcher;

	useEffect(() => {
		if (state !== "idle" || !data) return;

		const result = data as { success?: boolean; message?: string };
		const fetcherWithReset = fetcher as typeof fetcher & {
			reset?: () => void;
		};

		if (!result.success) {
			showDangerToast(result.message ?? "Kunne ikke flytte baren");
			setOrder(serverOrder);
			revalidate();
		}

		fetcherWithReset.reset?.();
	}, [state, data, fetcher, serverOrder, revalidate]);

	const handleDragEnd = () => {
		isDragging.current = false;

		if (order.join(",") === upcomingKey) return;

		const formData = new FormData();
		formData.append("barIds", JSON.stringify(order));

		fetcher.submit(formData, {
			method: "PATCH",
			action: `/api/sessions/${sessionId}/bars`,
		});
	};

	// Same rules as the server: bars coming up are anyone's to remove, and
	// finished bars are part of the results for good.
	const canRemove = (bar: SessionBar) =>
		bar.status === SessionBeerStatus.waiting ||
		(bar.status === SessionBeerStatus.rating &&
			(isOwner || (bar.addedByUserId === user.id && bar.placementCount === 0)));

	const rowActions = (bar: SessionBar) => ({
		onEdit:
			hasToken && !bar.foursquareId ? () => setEditingBarId(bar.id) : undefined,
		onRemove: canRemove(bar) ? () => removeBar(bar) : undefined,
	});

	const barsById = new Map(bars.map((bar) => [bar.id, bar]));
	const editingBar = editingBarId ? barsById.get(editingBarId) : undefined;

	// Before the start there's only room for the first bar.
	const canAdd = isRunning || bars.length === 0;

	return (
		<>
			<Group mt="xl" justify="space-between">
				<Text size="md" tt="uppercase">
					Barer
				</Text>

				{canAdd && (
					<ActionIcon
						variant="subtle"
						color="slateIndigo"
						aria-label="Tilføj bar"
						onClick={openAdd}
					>
						<IconPlus size={14} />
					</ActionIcon>
				)}
			</Group>

			<Divider opacity={0.5} mb="md" />

			{bars.length === 0 ? (
				<Text c="dimmed" fs="italic" ta="center">
					Der er ikke tilføjet nogle barer
				</Text>
			) : (
				<Stack gap={4}>
					{finishedBars.map((bar) => (
						<BarRow key={bar.id} bar={bar} {...rowActions(bar)} />
					))}

					{finishedBars.length > 0 && finishedBars.length < bars.length && (
						<Divider opacity={0.5} my={4} />
					)}

					{currentBars.map((bar) => (
						<BarRow key={bar.id} bar={bar} {...rowActions(bar)} />
					))}

					<Reorder.Group
						as="div"
						axis="y"
						values={order}
						onReorder={setOrder}
						style={{ display: "flex", flexDirection: "column", gap: 4 }}
					>
						{order.map((barId) => {
							const bar = barsById.get(barId);
							if (!bar) return null;

							return (
								<UpcomingBarRow
									key={barId}
									bar={bar}
									{...rowActions(bar)}
									onDragStart={() => {
										isDragging.current = true;
									}}
									onDragEnd={handleDragEnd}
								/>
							);
						})}
					</Reorder.Group>
				</Stack>
			)}

			<ModalAddBar
				opened={addOpened}
				onClose={closeAdd}
				onAdded={onBarAdded}
				user={user}
				sessionId={sessionId}
			/>

			{editingBar && (
				<ModalCorrectBar
					opened
					onClose={() => setEditingBarId(null)}
					user={user}
					sessionId={sessionId}
					bar={editingBar}
				/>
			)}
		</>
	);
}
