import { Button, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import type { SessionBar } from "~/types/oneBeer";
import { SessionBeerStatus, type SessionProgress } from "~/types/session";
import type { SessionUser } from "~/types/user";

import { useRemoveBar } from "~/hooks/useRemoveBar";

import { ModalCorrectBar } from "./modals/ModalBar";

type InputProps = {
	user: SessionUser;
	session: SessionProgress;
	bar: SessionBar;
};

export default function BarActions({ user, session, bar }: InputProps) {
	const [correctOpened, { open: openCorrect, close: closeCorrect }] =
		useDisclosure(false);
	const { removeBar, isRemoving } = useRemoveBar(session.sessionId);

	const canCorrect = !bar.foursquareId && !!user.untappd;
	const canRemove =
		bar.status !== SessionBeerStatus.rated &&
		(user.admin ||
			session.createdBy === user.id ||
			(bar.addedByUserId === user.id && bar.placementCount === 0));

	if (!canCorrect && !canRemove) return null;

	return (
		<>
			<Group grow mt="md">
				{canCorrect && (
					<Button variant="default" radius="md" onClick={openCorrect}>
						Find baren i søgningen
					</Button>
				)}

				{canRemove && (
					<Button
						variant="default"
						radius="md"
						loading={isRemoving}
						onClick={() => removeBar(bar)}
					>
						Fjern baren
					</Button>
				)}
			</Group>

			{canCorrect && (
				<ModalCorrectBar
					opened={correctOpened}
					onClose={closeCorrect}
					user={user}
					sessionId={session.sessionId}
					bar={bar}
				/>
			)}
		</>
	);
}
