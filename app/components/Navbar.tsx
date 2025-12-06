import {
	ActionIcon,
	Anchor,
	Avatar,
	Box,
	Button,
	CopyButton,
	Divider,
	Flex,
	Group,
	List,
	Stack,
	Text,
	Tooltip,
} from "@mantine/core";
import {
	IconDoorExit,
	IconExternalLink,
	IconPlus,
	IconTrash,
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

		if (!sessionProgress || !inProgressSession) {
			navigate("/sessions");
		} else {
			const sessionId = sessionProgress.sessionId;
			leaveFetcher.submit(null, {
				method: "POST",
				action: `/api/sessions/${sessionId}/leave`,
			});
		}
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

	const usersBeers = localSessionBeers
		.filter((beer) => beer.addedByUserId === user?.id)
		.sort((a, b) => (b.order ?? 0) - (a.order ?? 0));

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

	const UserListItem = ({ user }: { user: SessionProgressUser }) => {
		const firstLetter = user.email.slice(0, 1).toUpperCase();

		return (
			<Flex
				justify="space-between"
				pos="relative"
				align="center"
				h={25}
				mb="xs"
			>
				<Flex align="center">
					<Avatar
						src={user?.avatarURL}
						name={user.username ?? user.name ?? firstLetter}
						color="initials"
						size="sm"
						mr="xs"
					/>

					<Text size="sm" fw="500" lineClamp={1}>
						{user.name ?? user.email}
					</Text>
				</Flex>

				{user.untappdId && user.username && (
					<Tooltip label="Se Untappd-profil" position="bottom">
						<ActionIcon
							component={Link}
							variant="subtle"
							color="slateIndigo"
							to={createProfileLink(user.username)}
							target="_blank"
						>
							<IconExternalLink size={16} stroke={1.5} />
						</ActionIcon>
					</Tooltip>
				)}
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
			<Box>
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
						Forlad smagning
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
			</Box>
		</ModalAddBeers>
	);
}
