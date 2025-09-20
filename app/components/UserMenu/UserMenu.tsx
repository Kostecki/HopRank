import { Avatar, Menu, MenuDivider, Stack, Text, Tooltip } from "@mantine/core";
import { IconBeer, IconDatabase, IconLogout } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { useSocket } from "~/hooks/useSocket";

import { createProfileLink } from "~/utils/untappd";

import type { SessionUser } from "~/types/user";

import styles from "./UserMenu.module.css";

type InputProps = {
	user: SessionUser;
};

const DB_URL = (() => {
	if (typeof window === "undefined") return "#"; // SSR safeguard
	const { protocol, hostname } = window.location;

	if (hostname === "localhost") {
		return "https://local.drizzle.studio";
	}

	const hostWithoutDb = hostname.replace(/^db\./, "");
	const dbHost = `db.${hostWithoutDb}`;

	return `${protocol}//${dbHost}`;
})();

export function UserMenu({ user }: InputProps) {
	const { email, admin: isAdmin, untappd } = user;

	const firstLetter = email.slice(0, 1).toUpperCase();

	const [WSStatus, setWSStatus] = useState<
		"undefined" | "connecting" | "connected" | "disconnected"
	>("undefined");

	const socket = useSocket();

	useEffect(() => {
		if (!socket) return;

		const handleConnect = () => setWSStatus("connected");
		const handleDisconnect = () => setWSStatus("disconnected");
		const handleConnectError = () => setWSStatus("disconnected");
		const handleReconnectAttempt = () => setWSStatus("connecting");

		setWSStatus(socket.connected ? "connected" : "disconnected");

		socket.on("connect", handleConnect);
		socket.on("disconnect", handleDisconnect);
		socket.on("connect_error", handleConnectError);
		socket.on("reconnect_attempt", handleReconnectAttempt);

		return () => {
			socket.off("connect", handleConnect);
			socket.off("disconnect", handleDisconnect);
			socket.off("connect_error", handleConnectError);
			socket.off("reconnect_attempt", handleReconnectAttempt);
		};
	}, [socket]);

	const LATEST_COMMIT_HASH = import.meta.env.VITE_LATEST_COMMIT_HASH;
	const LATEST_COMMIT_MESSAGE = import.meta.env.VITE_LATEST_COMMIT_MESSAGE;
	const COMMIT_URL = `https://github.com/Kostecki/HopRank/commit/${LATEST_COMMIT_HASH}`;

	return (
		<Menu shadow="md" width="auto" withArrow>
			<Menu.Target>
				<Avatar
					src={untappd?.avatar}
					radius="100%"
					size="md"
					style={{
						cursor: "pointer",
						transition: "box-shadow 0.2s ease-in-out",
					}}
					className={
						WSStatus === "connected"
							? styles.glowPulseConnected
							: WSStatus === "connecting"
								? styles.glowPulseConnecting
								: WSStatus === "disconnected"
									? styles.glowPulseDisconnected
									: styles.glowPulseUndefined
					}
				>
					{firstLetter}
				</Avatar>
			</Menu.Target>

			<Menu.Dropdown>
				<Menu.Label>
					<Stack gap={0}>
						<Text fw={500} size="sm" c="slateIndigo">
							{untappd?.name ?? email}
						</Text>
						{untappd?.name && (
							<Text c="dimmed" fw={500} size="xs" fs="italic">
								{email}
							</Text>
						)}
					</Stack>
				</Menu.Label>
				<Menu.Divider />
				{untappd?.username && (
					<Menu.Item
						component={Link}
						to={createProfileLink(untappd?.username)}
						target="_blank"
						leftSection={<IconBeer size={16} />}
					>
						Untappd
					</Menu.Item>
				)}
				<Menu.Item
					component="a"
					href="/auth/logout"
					leftSection={<IconLogout size={16} />}
				>
					Log ud
				</Menu.Item>
				{isAdmin && (
					<>
						<MenuDivider />

						<Menu.Item
							component="a"
							href={DB_URL}
							target="_blank"
							leftSection={<IconDatabase size={16} />}
						>
							Drizzle Studio
						</Menu.Item>

						<Menu.Item component={Link} to={COMMIT_URL} target="_blank">
							<Tooltip
								label={LATEST_COMMIT_MESSAGE}
								withArrow
								position="bottom"
							>
								<Text size="xs" c="dimmed" fs="italic" fw={300}>
									Latest Commit: {LATEST_COMMIT_HASH}
								</Text>
							</Tooltip>
						</Menu.Item>
					</>
				)}
			</Menu.Dropdown>
		</Menu>
	);
}
