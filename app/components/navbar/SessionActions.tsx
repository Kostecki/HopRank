import { Button, CopyButton, Divider, Text } from "@mantine/core";
import { IconDoorExit, IconFlag } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useFetcher, useNavigate } from "react-router";

import type { SessionProgress } from "~/types/session";

import { useFetcherResult } from "~/hooks/useFetcherResult";

type SessionActionsProps = {
	sessionProgress: SessionProgress;
	/** Whether the viewer is logged in and the session isn't finished. */
	canLeave: boolean;
	inProgressSession: boolean;
	canFinish: boolean;
	/** Closes the navbar, before leaving or finishing. */
	onClose: () => void;
};

/** The join code and links to share, and leaving or finishing the session. */
export function SessionActions({
	sessionProgress,
	canLeave,
	inProgressSession,
	canFinish,
	onClose,
}: SessionActionsProps) {
	const navigate = useNavigate();
	const leaveFetcher = useFetcher();
	const finishFetcher = useFetcher();

	// Set after mount: there's no window during server rendering.
	const [origin, setOrigin] = useState("");
	useEffect(() => {
		setOrigin(window.location.origin);
	}, []);

	useFetcherResult(leaveFetcher, {
		errorMessage: "Kunne ikke forlade smagningen",
		onSuccess: () => navigate("/sessions"),
	});

	useFetcherResult(finishFetcher, {
		errorMessage: "Kunne ikke afslutte smagningen",
	});

	const handleLeaveSession = () => {
		onClose();

		if (!canLeave) {
			navigate("/sessions");
			return;
		}

		leaveFetcher.submit(null, {
			method: "POST",
			action: `/api/sessions/${sessionProgress.sessionId}/leave`,
		});
	};

	const handleFinishSession = () => {
		const confirmed = window.confirm(
			"Vil du afslutte smagningen for alle? Det kan ikke fortrydes.",
		);
		if (!confirmed) return;

		onClose();

		finishFetcher.submit(null, {
			method: "POST",
			action: `/api/sessions/${sessionProgress.sessionId}/finish`,
		});
	};

	return (
		<>
			<CopyButton value={sessionProgress.joinCode}>
				{({ copied, copy }) => (
					<Button c="slateIndigo" variant="white" size="xs" onClick={copy}>
						<Text ta="center" c="dimmed" size="sm">
							{copied ? "Pin kopieret" : `Pinkode: ${sessionProgress.joinCode}`}
						</Text>
					</Button>
				)}
			</CopyButton>

			<CopyButton value={`${origin}/j/${sessionProgress.joinCode}`}>
				{({ copied, copy }) => (
					<Button c="slateIndigo" variant="white" size="xs" onClick={copy}>
						<Text size="sm" fs="italic">
							{copied ? "Link kopieret" : "Del direkte link til smagning"}
						</Text>
					</Button>
				)}
			</CopyButton>

			<CopyButton value={`${origin}/v/${sessionProgress.joinCode}`}>
				{({ copied, copy }) => (
					<Button c="slateIndigo" variant="white" size="xs" onClick={copy}>
						<Text size="sm" fs="italic">
							{copied ? "Link kopieret" : "Kopiér link til storskærm"}
						</Text>
					</Button>
				)}
			</CopyButton>

			<Divider my="sm" mb="lg" opacity={0.5} />

			<Button
				justify="center"
				variant="default"
				leftSection={<IconDoorExit size={14} />}
				color="slateIndigo"
				fw={500}
				onClick={handleLeaveSession}
				loading={leaveFetcher.state === "submitting"}
			>
				{inProgressSession ? "Forlad smagning" : "Tilbage til smagninger"}
			</Button>

			{canFinish && (
				<Button
					justify="center"
					variant="default"
					leftSection={<IconFlag size={14} />}
					color="slateIndigo"
					fw={500}
					mt="xs"
					onClick={handleFinishSession}
					loading={finishFetcher.state !== "idle"}
				>
					Afslut smagning
				</Button>
			)}
		</>
	);
}
