import { Avatar, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { IconCheck, IconQuestionMark, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useFetcher, useNavigate } from "react-router";

import type { SessionProgress } from "~/types/session";
import type { SessionUser } from "~/types/user";
import type { KickVotePublicState } from "~/types/websocket";

import { useSocket } from "~/hooks/useSocket";
import { showDangerToast, showSuccessToast } from "~/utils/toasts";

type InputProps = {
	user: SessionUser;
	sessionProgress: SessionProgress;
};

export function ModalKickVote({ user, sessionProgress }: InputProps) {
	const socket = useSocket();
	const fetcher = useFetcher();
	const navigate = useNavigate();

	const [voteState, setVoteState] = useState<KickVotePublicState | null>(null);
	const [hasVoted, setHasVoted] = useState(false);

	const sessionId = sessionProgress.sessionId;

	// Defensive: this modal shouldn't strictly depend on some other
	// component's mount order having already joined the room. A repeat
	// socket.join server-side is a harmless no-op.
	useEffect(() => {
		if (!socket) return;

		const join = () => socket.emit("join-session", sessionId);
		join();
		socket.on("connect", join);

		return () => {
			socket.off("connect", join);
		};
	}, [socket, sessionId]);

	useEffect(() => {
		if (!socket) return;

		const handleStarted = (payload: KickVotePublicState) => {
			setHasVoted(false);
			setVoteState(payload);
		};

		const handleUpdated = (payload: KickVotePublicState) => {
			setVoteState(payload);
		};

		const handleResolved = (payload: {
			voteId: string;
			targetUserId: number;
			kicked: boolean;
			replaced?: boolean;
		}) => {
			const targetName =
				sessionProgress.users.find((u) => u.id === payload.targetUserId)
					?.name ?? "Deltageren";

			if (payload.kicked) {
				showSuccessToast(`${targetName} blev kicket fra smagningen`);
			} else if (!payload.replaced) {
				showDangerToast(
					`Afstemningen om at kicke ${targetName} fejlede. Deltageren bliver i smagningen.`,
				);
			}

			setVoteState(null);
			setHasVoted(false);

			if (payload.kicked && payload.targetUserId === user.id) {
				navigate("/sessions");
			}
		};

		socket.on("session:kick-vote-started", handleStarted);
		socket.on("session:kick-vote-updated", handleUpdated);
		socket.on("session:kick-vote-resolved", handleResolved);

		return () => {
			socket.off("session:kick-vote-started", handleStarted);
			socket.off("session:kick-vote-updated", handleUpdated);
			socket.off("session:kick-vote-resolved", handleResolved);
		};
	}, [socket, sessionProgress.users, user.id, navigate]);

	// The vote POST can be rejected (stale/expired vote, no longer eligible,
	// etc.) without any socket event ever following -- without this, a
	// rejected vote just leaves the buttons disabled forever with no feedback.
	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) return;
		if (typeof fetcher.data === "object" && "message" in fetcher.data) {
			showDangerToast(String(fetcher.data.message));
			setHasVoted(false);
		}
	}, [fetcher.state, fetcher.data]);

	const viewerIsActive =
		sessionProgress.users.find((u) => u.id === user.id)?.status === "active";

	const opened = voteState !== null && viewerIsActive;
	const isTarget = voteState?.targetUserId === user.id;

	const handleVote = (vote: boolean) => {
		if (!voteState) return;

		setHasVoted(true);
		fetcher.submit(
			{ voteId: voteState.voteId, vote: String(vote) },
			{ method: "POST", action: `/api/sessions/${sessionId}/kick-vote` },
		);
	};

	if (!voteState) return null;

	const pendingCount = Math.max(
		voteState.totalEligible - voteState.yesCount - voteState.noCount,
		0,
	);
	const voteCircles = [
		...Array.from({ length: voteState.yesCount }, (_, i) => (
			// biome-ignore lint/suspicious/noArrayIndexKey: decorative, no stable identity
			<Avatar key={`yes-${i}`} color="red" radius="xl" size="md">
				<IconCheck size={16} stroke={3} />
			</Avatar>
		)),
		...Array.from({ length: voteState.noCount }, (_, i) => (
			<Avatar
				// biome-ignore lint/suspicious/noArrayIndexKey: decorative, no stable identity
				key={`no-${i}`}
				color="slateIndigo"
				radius="xl"
				size="md"
			>
				<IconX size={16} stroke={3} />
			</Avatar>
		)),
		...Array.from({ length: pendingCount }, (_, i) => (
			<Avatar
				// biome-ignore lint/suspicious/noArrayIndexKey: decorative, no stable identity
				key={`pending-${i}`}
				variant="outline"
				color="gray"
				radius="xl"
				size="md"
			>
				<IconQuestionMark size={16} stroke={3} />
			</Avatar>
		)),
	];

	const initiatorName =
		sessionProgress.users.find((u) => u.id === voteState.initiatorUserId)
			?.name ?? "En deltager";
	const targetName =
		sessionProgress.users.find((u) => u.id === voteState.targetUserId)?.name ??
		"deltageren";

	return (
		<Modal
			opened={opened}
			onClose={() => {}}
			closeOnClickOutside={false}
			closeOnEscape={false}
			withCloseButton={false}
			title="Kick Deltager?"
		>
			<Stack gap="sm">
				{isTarget ? (
					<Text size="sm">
						<strong>{initiatorName}</strong> har startet en afstemning om at
						kicke dig fra smagningen.
					</Text>
				) : (
					<Text size="sm">
						<strong>{initiatorName}</strong> har startet en afstemning om at
						kicke <strong>{targetName}</strong> fra smagningen.
					</Text>
				)}

				<Stack gap={4} align="center" mt="md" mb="xs">
					<Group gap="xs" justify="center" mb="xs">
						{voteCircles}
					</Group>
					<Text size="xs" c="dimmed">
						{voteState.threshold} ja-stemmer ud af {voteState.totalEligible}{" "}
						kræves for at kicke
					</Text>
				</Stack>

				{!isTarget && (
					<Group grow mt="xs">
						<Button
							color="red"
							variant="light"
							disabled={hasVoted}
							loading={hasVoted && fetcher.state !== "idle"}
							onClick={() => handleVote(true)}
						>
							Kick
						</Button>
						<Button
							color="slateIndigo"
							variant="light"
							disabled={hasVoted}
							onClick={() => handleVote(false)}
						>
							Behold
						</Button>
					</Group>
				)}

				{!isTarget && hasVoted && (
					<Text size="xs" c="dimmed" ta="center">
						Du har stemt &mdash; venter på resten af smagningen.
					</Text>
				)}
			</Stack>
		</Modal>
	);
}
