import { AppShell, Container } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, useLoaderData } from "react-router";

import { userSessionGet } from "~/auth/users.server";
import type { SelectSessionBeersWithBeer } from "~/database/schema.types";

import { Header } from "~/components/Header";
import Navbar from "~/components/Navbar";

import { extractSessionId } from "~/utils/utils";

import type { SessionProgress } from "~/types/session";
import type { Route } from "../+types/root";

export async function loader({ params, request }: Route.LoaderArgs) {
	let sessionId = undefined;
	if (params.sessionId) {
		sessionId = extractSessionId(params.sessionId);
	}

	const user = await userSessionGet(request);

	const url = new URL(request.url);
	const origin = `${url.protocol}//${url.host}`;

	let sessionProgress = null;
	if (sessionId) {
		const response = await fetch(
			`${origin}/api/sessions/${sessionId}/progress`,
		);
		sessionProgress = (await response.json()) as SessionProgress;
	}

	const beersResponse = await fetch(
		`${origin}/api/sessions/${sessionId}/list-beers`,
	);
	const sessionBeers =
		(await beersResponse.json()) as SelectSessionBeersWithBeer[];

	return {
		sessionId,
		user,
		sessionProgress,
		sessionBeers,
	};
}

export default function Layout() {
	const { user, sessionProgress, sessionBeers } =
		useLoaderData<typeof loader>();

	const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
		useDisclosure();
	const [desktopOpened, { toggle: toggleDesktop, close: closeDesktop }] =
		useDisclosure(false);

	return (
		<AppShell
			header={{ height: 60 }}
			navbar={{
				width: 300,
				breakpoint: "sm",
				collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
			}}
		>
			<AppShell.Header>
				<Header
					user={user}
					session={sessionProgress}
					mobileOpened={mobileOpened}
					desktopOpened={desktopOpened}
					toggleMobile={toggleMobile}
					toggleDesktop={toggleDesktop}
				/>
			</AppShell.Header>

			<AppShell.Navbar p="md">
				<Navbar
					user={user}
					sessionProgress={sessionProgress}
					sessionBeers={sessionBeers}
					closeMobile={closeMobile}
					closeDesktop={closeDesktop}
				/>
			</AppShell.Navbar>

			<AppShell.Main>
				<Container size="xs" mt="md" pb="xs">
					<Outlet />
				</Container>
			</AppShell.Main>
		</AppShell>
	);
}
