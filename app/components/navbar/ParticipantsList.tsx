import {
	ActionIcon,
	Avatar,
	Divider,
	Flex,
	Group,
	List,
	Text,
	Tooltip,
} from "@mantine/core";
import { IconExternalLink, IconUserX } from "@tabler/icons-react";
import { Link, useFetcher } from "react-router";

import type { SessionProgress, SessionProgressUser } from "~/types/session";

import { useFetcherResult } from "~/hooks/useFetcherResult";
import { createProfileLink } from "~/utils/untappd";
import { sortByDisplayName } from "~/utils/utils";

function ParticipantRow({
	user: rowUser,
	canKick,
	onKick,
}: {
	user: SessionProgressUser;
	canKick: boolean;
	onKick: (userId: number) => void;
}) {
	const firstLetter = (rowUser.name ?? rowUser.username ?? "?")
		.slice(0, 1)
		.toUpperCase();

	const isGone = rowUser.status !== "active";
	const goneLabel =
		rowUser.status === "kicked"
			? "Stemt ud af smagningen"
			: "Forlod smagningen";

	const nameAndAvatar = (
		<Flex align="center">
			<Avatar
				src={rowUser?.avatarURL}
				name={rowUser.username ?? rowUser.name ?? firstLetter}
				color="initials"
				size="sm"
				mr="xs"
			/>

			<Text
				size="sm"
				fw="500"
				lineClamp={1}
				td={isGone ? "line-through" : undefined}
			>
				{rowUser.name ?? rowUser.username ?? "Deltager"}
			</Text>
		</Flex>
	);

	return (
		<Flex
			justify="space-between"
			pos="relative"
			align="center"
			h={25}
			mb="xs"
			opacity={isGone ? 0.5 : 1}
		>
			{isGone ? (
				<Tooltip label={goneLabel} position="bottom">
					{nameAndAvatar}
				</Tooltip>
			) : (
				nameAndAvatar
			)}

			<Flex align="center" gap={4}>
				{rowUser?.untappdId && rowUser.username && (
					<Tooltip label="Se Untappd-profil" position="bottom">
						<ActionIcon
							component={Link}
							variant="subtle"
							color="slateIndigo"
							to={createProfileLink(rowUser.username)}
							target="_blank"
							aria-label="Se profil på Untappd"
						>
							<IconExternalLink size={16} stroke={1.5} />
						</ActionIcon>
					</Tooltip>
				)}

				{canKick && (
					<Tooltip label="Start afstemning om at kicke" position="bottom">
						<ActionIcon
							variant="subtle"
							color="red"
							onClick={() => onKick(rowUser.id)}
							aria-label="Start afstemning om at kicke"
						>
							<IconUserX size={16} stroke={1.5} />
						</ActionIcon>
					</Tooltip>
				)}
			</Flex>
		</Flex>
	);
}

type ParticipantsListProps = {
	sessionProgress: SessionProgress;
	viewerId: number | undefined;
	/** Whether the viewer may start a vote to kick someone. */
	canKick: boolean;
};

/** Everyone in the session, with a button to start a vote to kick someone. */
export function ParticipantsList({
	sessionProgress,
	viewerId,
	canKick,
}: ParticipantsListProps) {
	const kickFetcher = useFetcher();

	useFetcherResult(kickFetcher, {
		errorMessage: "Kunne ikke starte afstemning",
	});

	const handleKick = (targetUserId: number) => {
		kickFetcher.submit(
			{ targetUserId: String(targetUserId) },
			{
				method: "POST",
				action: `/api/sessions/${sessionProgress.sessionId}/kick`,
			},
		);
	};

	if (sessionProgress.users.length === 0) return null;

	return (
		<>
			<Group mt="xl" justify="space-between">
				<Text size="md" tt="uppercase">
					Deltagere
				</Text>
			</Group>

			<Divider opacity={0.5} mb="md" />

			<List spacing="xs" size="sm" pl={0}>
				{sortByDisplayName(sessionProgress.users).map((rowUser) => (
					<ParticipantRow
						key={rowUser.id}
						user={rowUser}
						canKick={
							canKick && rowUser.status === "active" && rowUser.id !== viewerId
						}
						onKick={handleKick}
					/>
				))}
			</List>
		</>
	);
}
