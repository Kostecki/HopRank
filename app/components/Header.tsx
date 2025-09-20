import { Burger, Group, Paper, Text, useMantineTheme } from "@mantine/core";
import { IconBeer, IconUsers } from "@tabler/icons-react";
import { useRevalidator } from "react-router";

import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";

import { type SessionProgress, SessionStatus } from "~/types/session";
import type { SessionUser } from "~/types/user";

import { UserMenu } from "./UserMenu/UserMenu";

type InputProps = {
	user: SessionUser | null;
	session: SessionProgress | null;
	mobileOpened: boolean;
	desktopOpened: boolean;
	toggleMobile: () => void;
	toggleDesktop: () => void;
};

export function Header({
	user,
	session,
	mobileOpened,
	desktopOpened,
	toggleMobile,
	toggleDesktop,
}: InputProps) {
	const theme = useMantineTheme();
	const slateIndigo = theme.colors.slateIndigo[6];

	const { revalidate } = useRevalidator();

	useDebouncedSocketEvent(
		["session:users-changed"],
		() => revalidate(),
		session?.sessionId,
	);

	return (
		<Paper shadow="md" h="100%">
			<Group justify="space-between" px="md" pt="sm">
				<Group gap="sm">
					{session && (
						<>
							<Group gap="xs" mr="xs">
								<Burger
									opened={mobileOpened}
									onClick={toggleMobile}
									hiddenFrom="sm"
									size="sm"
								/>
								<Burger
									opened={desktopOpened}
									onClick={toggleDesktop}
									visibleFrom="sm"
									size="sm"
								/>
							</Group>
							<Group gap="8">
								<IconUsers color={slateIndigo} size={20} />
								<Text c="slateIndigo" fw={600}>
									{session.users.length}
								</Text>
							</Group>
							<Group gap="5">
								<IconBeer color={slateIndigo} size={20} />
								<Text c="slateIndigo" fw={600}>
									{session.status === SessionStatus.active
										? `${session.beersRatedCount} / ${session.beersTotalCount}`
										: session.beersTotalCount}
								</Text>
							</Group>
						</>
					)}
				</Group>
				{user && <UserMenu user={user} />}
			</Group>
		</Paper>
	);
}
