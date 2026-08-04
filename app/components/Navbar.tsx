import {
	ActionIcon,
	Anchor,
	Avatar,
	Button,
	CopyButton,
	Divider,
	Flex,
	Group,
	List,
	ScrollArea,
	Stack,
	Text,
	Tooltip,
} from "@mantine/core";
import {
	IconDoorExit,
	IconExternalLink,
	IconPlus,
	IconTrash,
	IconUserX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import {
	Link,
	useFetcher,
	useLocation,
	useNavigate,
	useRevalidator,
} from "react-router";

import {
	SessionBeerStatus,
	type SessionProgress,
	type SessionProgressUser,
	SessionStatus,
} from "~/types/session";
import type { SessionUser } from "~/types/user";

import type { SelectSessionBeersWithBeer } from "~/database/schema.types";
import { showDangerToast } from "~/utils/toasts";
import { createBeerLink, createProfileLink } from "~/utils/untappd";

import ModalAddBeers, { ModalAddBeersTrigger } from "./modals/ModalAddBeers";

type InputProps = {
	user: SessionUser;
	sessionProgress: SessionProgress | null;
	sessionBeers: SelectSessionBeersWithBeer[];
	closeMobile: () => void;
	closeDesktop: () => void;
};

export default function Navbar({
	user,
	sessionProgress,
	sessionBeers,
	closeMobile,
	closeDesktop,
}: InputProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const leaveFetcher = useFetcher();
	const removeFetcher = useFetcher();
	const kickFetcher = useFetcher();
	const { revalidate } = useRevalidator();

	const [localSessionBeers, setLocalSessionBeers] = useState(sessionBeers);
	const [origin, setOrigin] = useState("");
	const [pendingBeersSnapshot, setPendingBeersSnapshot] = useState<
		SelectSessionBeersWithBeer[] | null
	>(null);

	const inProgressSession =
		sessionProgress?.status === SessionStatus.active ||
		sessionProgress?.status === SessionStatus.created;
	const readOnly = location.pathname.endsWith("/view");

	const handleLeaveSession = async () => {
		closeMobile();
		closeDesktop();

		if (!user || !sessionProgress || !inProgressSession) {
			navigate("/sessions");
		} else {
			const sessionId = sessionProgress.sessionId;
			leaveFetcher.submit(null, {
				method: "POST",
				action: `/api/sessions/${sessionId}/leave`,
			});
		}
	};

	const handleKick = (targetUserId: number) => {
		const sessionId = sessionProgress?.sessionId;
		if (!sessionId) return;

		kickFetcher.submit(
			{ targetUserId: String(targetUserId) },
			{ method: "POST", action: `/api/sessions/${sessionId}/kick` },
		);
	};

	const handleRemoveBeer = async (beerId: number) => {
		const sessionId = sessionProgress?.sessionId;
		if (!sessionId) return;

		const prevBeers = localSessionBeers;
		setLocalSessionBeers((prev) => prev.filter((b) => b.beerId !== beerId));
		setPendingBeersSnapshot(prevBeers);

		removeFetcher.submit(null, {
			method: "POST",
			action: `/api/sessions/${sessionId}/remove/${beerId}`,
		});
	};

	// Sorted by the stable session_beers id (insertion order), not the
	// tasting-queue `order` field — that field gets reshuffled whenever any
	// waiting beer is added or removed (to keep queue variety), which would
	// otherwise make a user's own unrelated beers visibly reorder in this list.
	const usersBeers = localSessionBeers
		.filter((beer) => beer.addedByUserId === user?.id)
		.sort((a, b) => b.id - a.id);

	useEffect(() => {
		setLocalSessionBeers(sessionBeers);
	}, [sessionBeers]);

	useEffect(() => {
		setOrigin(window.location.origin);
	}, []);

	useEffect(() => {
		if (removeFetcher.state !== "idle" || !pendingBeersSnapshot) {
			return;
		}

		const result = removeFetcher.data as
			| { success: true }
			| { message?: string }
			| undefined;

		if (!result || "success" in result) {
			setPendingBeersSnapshot(null);
			return;
		}

		setLocalSessionBeers(pendingBeersSnapshot);
		setPendingBeersSnapshot(null);
		console.error("Failed to remove beer", result);
	}, [removeFetcher.state, removeFetcher.data, pendingBeersSnapshot]);

	useEffect(() => {
		if (leaveFetcher.state !== "idle") return;
		const result = leaveFetcher.data as { success?: boolean } | undefined;
		if (result?.success) {
			navigate("/sessions");
		}
	}, [leaveFetcher.state, leaveFetcher.data, navigate]);

	useEffect(() => {
		if (kickFetcher.state !== "idle" || !kickFetcher.data) return;

		const result = kickFetcher.data as { success: true } | { message?: string };

		if (!("success" in result)) {
			showDangerToast(result.message ?? "Kunne ikke starte afstemning");
		}
	}, [kickFetcher.state, kickFetcher.data]);

	const viewerIsActive =
		sessionProgress?.users.find((u) => u.id === user?.id)?.status === "active";

	const UserListItem = ({ user: rowUser }: { user: SessionProgressUser }) => {
		const firstLetter = (rowUser.name ?? rowUser.username ?? "?")
			.slice(0, 1)
			.toUpperCase();

		const isGone = rowUser.status !== "active";
		const goneLabel =
			rowUser.status === "kicked"
				? "Stemt ud af smagningen"
				: "Forlod smagningen";

		const canKick =
			!readOnly && !isGone && viewerIsActive && rowUser.id !== user.id;

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
								onClick={() => handleKick(rowUser.id)}
							>
								<IconUserX size={16} stroke={1.5} />
							</ActionIcon>
						</Tooltip>
					)}
				</Flex>
			</Flex>
		);
	};

	const ListItem = ({ beer }: { beer: SelectSessionBeersWithBeer }) => {
		const {
			beer: { id, name, breweryName, untappdBeerId },
		} = beer;

		const isDisabled =
			beer.status === SessionBeerStatus.rating ||
			beer.status === SessionBeerStatus.rated;

		const untappdLink = createBeerLink(untappdBeerId);

		return (
			<Flex justify="space-between" pos="relative">
				<Stack gap={0} mb="sm">
					<Anchor underline="never" href={untappdLink} target="_blank">
						<Text size="sm" fw="500" lineClamp={1} mr="xs" c="black">
							{name}
						</Text>
						<Text size="sm" c="dimmed" lineClamp={1}>
							{breweryName}
						</Text>
					</Anchor>
				</Stack>

				<ActionIcon
					variant="subtle"
					color="slateIndigo"
					onClick={() => handleRemoveBeer(id)}
					disabled={isDisabled}
				>
					<IconTrash style={{ width: "70%", height: "70%" }} stroke={1.5} />
				</ActionIcon>
			</Flex>
		);
	};

	if (!sessionProgress) return "None";

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

					<CopyButton value={sessionProgress.joinCode}>
						{({ copied, copy }) => (
							<Button c="slateIndigo" variant="white" size="xs" onClick={copy}>
								<Text
									ta="center"
									c="dimmed"
									size="sm"
									onClick={copy}
									style={{ cursor: "pointer" }}
								>
									{copied
										? "Pin kopieret"
										: `Pinkode: ${sessionProgress.joinCode}`}
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

					{sessionProgress.users.length > 0 && (
						<>
							<Group mt="xl" justify="space-between">
								<Text size="md" tt="uppercase">
									Deltagere
								</Text>
							</Group>

							<Divider opacity={0.5} mb="md" />

							<List spacing="xs" size="sm" pl={0}>
								{sessionProgress.users.map((user) => (
									<UserListItem key={user.id} user={user} />
								))}
							</List>
						</>
					)}

					{inProgressSession && !readOnly && (
						<>
							<Group mt="xl" justify="space-between">
								<Text size="md" tt="uppercase">
									Dine øl
								</Text>

								<ModalAddBeersTrigger>
									<ActionIcon variant="subtle" color="slateIndigo">
										<IconPlus size={14} />
									</ActionIcon>
								</ModalAddBeersTrigger>
							</Group>

							<Divider opacity={0.5} mb="md" />

							{usersBeers.length > 0 ? (
								<List spacing="xs" size="sm" pl={0}>
									{usersBeers.map((beer) => (
										<ListItem key={beer.beerId} beer={beer} />
									))}
								</List>
							) : (
								<Text c="dimmed" fs="italic" ta="center">
									Der er ikke tilføjet nogle øl
								</Text>
							)}
						</>
					)}
				</Stack>
			</ScrollArea>
		</ModalAddBeers>
	);
}
