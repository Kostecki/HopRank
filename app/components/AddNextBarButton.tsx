import { Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import type { SessionUser } from "~/types/user";

import { ModalAddBar } from "./modals/ModalBar";

type InputProps = {
	user: SessionUser;
	sessionId: number;
};

/** Shown when no bar is open, which is when the next one needs adding. */
export default function AddNextBarButton({ user, sessionId }: InputProps) {
	const [opened, { open, close }] = useDisclosure(false);

	return (
		<>
			<Button
				variant="default"
				radius="md"
				fullWidth
				mb="md"
				leftSection={<IconPlus size={16} />}
				onClick={open}
			>
				Tilføj næste bar
			</Button>

			<ModalAddBar
				opened={opened}
				onClose={close}
				user={user}
				sessionId={sessionId}
			/>
		</>
	);
}
