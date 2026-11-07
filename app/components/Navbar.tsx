import { ScrollArea, Stack, Text } from "@mantine/core";
import { useLocation, useRevalidator } from "react-router";

import type { SessionBar } from "~/types/oneBeer";
import {
	SessionMode,
	type SessionProgress,
	SessionStatus,
} from "~/types/session";
import type { SessionUser } from "~/types/user";

import type { SelectSessionBeersWithBeer } from "~/database/schema.types";

import ModalAddBeers from "./modals/ModalAddBeers";
import NavbarBars from "./NavbarBars";
import { ParticipantsList } from "./navbar/ParticipantsList";
import { SessionActions } from "./navbar/SessionActions";
import { UserBeersList } from "./navbar/UserBeersList";

type InputProps = {
	user: SessionUser | null;
	sessionProgress: SessionProgress | null;
	sessionBeers: SelectSessionBeersWithBeer[];
	sessionBars: SessionBar[];
	closeMobile: () => void;
	closeDesktop: () => void;
};

export default function Navbar({
	user,
	sessionProgress,
	sessionBeers,
	sessionBars,
	closeMobile,
	closeDesktop,
}: InputProps) {
	const location = useLocation();
	const { revalidate } = useRevalidator();

	if (!sessionProgress) return null;

	const inProgressSession =
		sessionProgress.status === SessionStatus.active ||
		sessionProgress.status === SessionStatus.created;
	const readOnly = location.pathname.endsWith("/view");

	const canFinish =
		inProgressSession &&
		!readOnly &&
		(sessionProgress.createdBy === user?.id || !!user?.admin);

	const viewerIsActive =
		sessionProgress.users.find((u) => u.id === user?.id)?.status === "active";

	return (
		<ModalAddBeers
			sessionProgress={sessionProgress}
			sessionBeers={sessionBeers}
			onBeersUpdated={revalidate}
		>
			<ScrollArea h="100%" type="auto">
				<Stack gap="0">
					<Text ta="center" fw={500} size="lg">
						{sessionProgress.sessionName}
					</Text>

					<SessionActions
						sessionProgress={sessionProgress}
						canLeave={!!user && inProgressSession}
						inProgressSession={inProgressSession}
						canFinish={canFinish}
						onClose={() => {
							closeMobile();
							closeDesktop();
						}}
					/>

					<ParticipantsList
						sessionProgress={sessionProgress}
						viewerId={user?.id}
						canKick={!readOnly && viewerIsActive}
					/>

					{user &&
						inProgressSession &&
						!readOnly &&
						viewerIsActive &&
						sessionProgress.mode === SessionMode.oneBeer && (
							<NavbarBars
								user={user}
								session={sessionProgress}
								bars={sessionBars}
								onBarAdded={closeMobile}
							/>
						)}

					{inProgressSession &&
						!readOnly &&
						sessionProgress.mode !== SessionMode.oneBeer && (
							<UserBeersList
								sessionId={sessionProgress.sessionId}
								sessionBeers={sessionBeers}
								viewerId={user?.id}
							/>
						)}
				</Stack>
			</ScrollArea>
		</ModalAddBeers>
	);
}
