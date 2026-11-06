import { ActionIcon, Affix, Box, Indicator } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconListNumbers } from "@tabler/icons-react";

import type { SessionBar } from "~/types/oneBeer";

import BarListDrawer from "./BarListDrawer";

type InputProps = {
	sessionId: number;
	// The person's own ranking, best bar first.
	bars: SessionBar[];
	// The open bar the person hasn't ranked yet.
	newBarId: number | null;
};

const BUTTON_SIZE = 56;
const SCREEN_MARGIN = 20;

/** Floats over the page, one tap away from the person's own ranking. */
export default function RankingButton({
	sessionId,
	bars,
	newBarId,
}: InputProps) {
	const [opened, { open, close }] = useDisclosure(false);
	const needsToRank = newBarId !== null;

	return (
		<>
			{/* Room to scroll past the button, which would otherwise cover content
			    at the bottom of the page. */}
			<Box h={BUTTON_SIZE + SCREEN_MARGIN} />

			{/* Below the panel, which would otherwise be covered. */}
			<Affix
				zIndex={150}
				position={{ bottom: SCREEN_MARGIN, right: SCREEN_MARGIN }}
			>
				<Indicator disabled={!needsToRank} color="red" size={14} offset={6}>
					<ActionIcon
						size={BUTTON_SIZE}
						radius="xl"
						color="slateIndigo"
						aria-label={needsToRank ? "Rangér baren" : "Din rangering"}
						onClick={open}
						style={{ boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)" }}
					>
						<IconListNumbers size={26} />
					</ActionIcon>
				</Indicator>
			</Affix>

			<BarListDrawer
				sessionId={sessionId}
				bars={bars}
				newBarId={newBarId}
				opened={opened}
				onClose={close}
			/>
		</>
	);
}
