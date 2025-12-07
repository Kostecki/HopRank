import { Accordion, Box, Divider } from "@mantine/core";
import { eq } from "drizzle-orm";
import { useMemo } from "react";
import { redirect, useLoaderData, useRevalidator } from "react-router";

import { SessionStatus } from "~/types/session";
import type { SocketEvent } from "~/types/websocket";
import type { Route } from "./+types/sessionId";

import { userSessionGet } from "~/auth/users.server";
import { BeerCard } from "~/components/BeerCard";
import { BeerCardDetails } from "~/components/BeerCardDetails";
import EmptySession from "~/components/EmptySession";
import { StartSession } from "~/components/StartSession";
import UpNext from "~/components/UpNext";
import { db } from "~/database/config.server";
import { beers, sessionBeers, sessionCriteria } from "~/database/schema.server";
import type { SelectBeers } from "~/database/schema.types";
import { getSessionProgress } from "~/database/utils/getSessionProgress.server";
import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";
import { ERROR_CODES, errorJson } from "~/utils/errors";
import { extractSessionId, getPageTitle } from "~/utils/utils";

export function meta() {
	return [{ title: getPageTitle("Smagning") }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
	if (!params?.sessionId) {
		return redirect("/sessions");
	}

	const sessionId = extractSessionId(params.sessionId);

	const user = await userSessionGet(request);
	if (!user) {
		return redirect("/auth/login");
	}

	const sessionProgress = await getSessionProgress({ request, sessionId });
	// Handle not-found shape without assuming the property exists on the success type
	if ("statusCode" in sessionProgress && sessionProgress.statusCode === 404) {
		throw errorJson(404, { errorCode: ERROR_CODES.SESSION_NOT_FOUND });
	}

	if (sessionProgress.status === SessionStatus.finished) {
		return redirect("view");
	}

	const [criteriaWithDetails, sessionBeerRows] = await Promise.all([
		db.query.sessionCriteria.findMany({
			where: eq(sessionCriteria.sessionId, sessionId),
			with: { criterion: true },
		}),
		db
			.select({
				sessionBeer: sessionBeers,
				beer: beers,
			})
			.from(sessionBeers)
			.innerJoin(beers, eq(sessionBeers.beerId, beers.id))
			.where(eq(sessionBeers.sessionId, sessionId)),
	]);

	const sessionBeersList: SelectBeers[] = sessionBeerRows.map(
		({ beer }) => beer,
	);

	const criteria = criteriaWithDetails
		.filter(
			(
				row,
			): row is typeof row & { criterion: NonNullable<typeof row.criterion> } =>
				row.criterion !== null,
		)
		.map((row) => ({
			id: row.criterion.id,
			name: row.criterion.name,
			description: row.criterion.description,
			weight: row.criterion.weight,
		}));

	return {
		user,
		sessionProgress,
		criteria,
		sessionBeers: sessionBeersList,
	};
}

export default function Session() {
	const { user, sessionProgress, criteria, sessionBeers } =
		useLoaderData<typeof loader>();

	const { revalidate } = useRevalidator();

	const socketEvents = useMemo<SocketEvent[]>(
		() => [
			"sessions:created",
			"session:started",
			"session:users-changed",
			"session:beer-changed",
			"session:vote",
		],
		[],
	);

	const hasCurrentBeer =
		sessionProgress.status === SessionStatus.active &&
		sessionProgress.currentBeer &&
		Object.keys(sessionProgress.currentBeer).length !== 0;

	// An active session that has yet to have beers added
	const emptySession =
		sessionProgress.status === SessionStatus.active &&
		sessionProgress.ratedBeers.length === 0 &&
		!hasCurrentBeer;

	useDebouncedSocketEvent(
		socketEvents,
		async () => revalidate(),
		sessionProgress.sessionId,
	);

	return (
		<>
			{emptySession && (
				<EmptySession sessionBeers={sessionBeers} onBeersUpdated={revalidate} />
			)}

			{!emptySession && sessionProgress.status === SessionStatus.created && (
				<StartSession user={user} session={sessionProgress} />
			)}

			{hasCurrentBeer && (
				<UpNext
					user={user}
					session={sessionProgress}
					criteria={criteria}
					mb="xl"
				/>
			)}

			<Accordion unstyled chevron={null}>
				{sessionProgress.ratedBeers.map((beer, index) => {
					const { beerId } = beer;

					return (
						<Box key={beerId}>
							<Accordion.Item
								value={beerId.toString()}
								m={0}
								mb={index === 2 ? "30px" : "8px"}
							>
								<Accordion.Control
									style={{
										background: "none",
										border: "none",
										padding: 0,
										margin: 0,
										width: "100%",
										cursor: "pointer",
										userSelect: "none",
									}}
								>
									<BeerCard
										session={sessionProgress}
										beer={beer}
										rank={index + 1}
									/>
								</Accordion.Control>

								<Accordion.Panel>
									<BeerCardDetails beer={beer} />
								</Accordion.Panel>
							</Accordion.Item>

							{index === 2 ? <Divider my="30px" opacity={0.5} /> : null}
						</Box>
					);
				})}
			</Accordion>
		</>
	);
}
