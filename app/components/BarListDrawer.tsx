import { Drawer } from "@mantine/core";

import type { SessionBar } from "~/types/oneBeer";

import BarRankingList from "./BarRankingList";

type InputProps = {
	sessionId: number;
	bars: SessionBar[];
	// The open bar the person hasn't placed yet.
	newBarId: number | null;
	opened: boolean;
	onClose: () => void;
};

/** Keeps the personal list, which can get long, off the session page. */
export default function BarListDrawer({
	sessionId,
	bars,
	newBarId,
	opened,
	onClose,
}: InputProps) {
	return (
		// Stays mounted so an unsaved order survives closing the panel.
		<Drawer
			keepMounted
			position="right"
			padding="sm"
			opened={opened}
			onClose={onClose}
			title="Din rangering"
		>
			<BarRankingList
				sessionId={sessionId}
				bars={bars}
				newBarId={newBarId}
				onSaved={onClose}
			/>
		</Drawer>
	);
}
