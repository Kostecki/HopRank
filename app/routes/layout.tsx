import { AppShell, Container, Progress } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { eq } from "drizzle-orm";
import { Outlet, useLoaderData } from "react-router";

import type { SessionProgress } from "~/types/session";
import type { Route } from "../+types/root";

import { userSessionGet } from "~/auth/users.server";
import { Header } from "~/components/Header";
import { ModalSetName } from "~/components/modals/ModalSetName";
import Navbar from "~/components/Navbar";
import { SocketProvider } from "~/context/SocketContext";
import { db } from "~/database/config.server";
import { beers, sessionBeers } from "~/database/schema.server";
import type { SelectSessionBeersWithBeer } from "~/database/schema.types";
import { getSessionProgress } from "~/database/utils/getSessionProgress.server";
import { extractSessionId } from "~/utils/utils";

export async function loader({ params, request }: Route.LoaderArgs) {
	let sessionId: number | undefined;
	if (params.sessionId) {
		sessionId = extractSessionId(params.sessionId);
	}

	const user = await userSessionGet(request);

	let sessionProgress: SessionProgress | null = null;
	let sessionBeersList: SelectSessionBeersWithBeer[] = [];
	if (sessionId) {
		const [sessionProgressResult, sessionBeersResult] = await Promise.all([
			getSessionProgress({ request, sessionId }),
			db
				.select({
					sessionBeer: sessionBeers,
					beer: beers,
				})
				.from(sessionBeers)
				.innerJoin(beers, eq(sessionBeers.beerId, beers.id))
				.where(eq(sessionBeers.sessionId, sessionId)),
		]);

		if (!("statusCode" in sessionProgressResult)) {
			sessionProgress = sessionProgressResult;
		}

		sessionBeersList = sessionBeersResult.map(({ sessionBeer, beer }) => ({
			...sessionBeer,
			beer,
		}));
	}

	return {
		user,
		sessionProgress,
		sessionBeers: sessionBeersList,
		progressPercentage: sessionProgress?.progressPercentage ?? undefined,
	};
}

export default function Layout() {
	const { user, sessionProgress, sessionBeers, progressPercentage } =
		useLoaderData<typeof loader>();

	const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
		useDisclosure();
	const [desktopOpened, { toggle: toggleDesktop, close: closeDesktop }] =
		useDisclosure(false);

	return (
		<SocketProvider>
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
					{progressPercentage && (
						<Progress
							value={progressPercentage}
							radius="xs"
							size="xs"
							color="slateIndigo"
							transitionDuration={200}
						/>
					)}

					<Container strategy="grid" size="xs" p="md">
						<Outlet />

						{user && (!user?.untappd || !user?.name) && (
							<ModalSetName user={user} />
						)}
					</Container>
				</AppShell.Main>
			</AppShell>
		</SocketProvider>
	);
}
