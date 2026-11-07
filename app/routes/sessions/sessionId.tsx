import { eq } from "drizzle-orm";
import { useMemo } from "react";
import { redirect, useLoaderData, useRevalidator } from "react-router";

import { SessionMode, SessionStatus } from "~/types/session";
import type { SocketEvent } from "~/types/websocket";
import type { Route } from "./+types/sessionId";

import { BeerCard } from "~/components/BeerCard";
import { BeerCardDetails } from "~/components/BeerCardDetails";
import EmptySession from "~/components/EmptySession";
import OneBeerSession from "~/components/OneBeerSession";
import RankedAccordion from "~/components/RankedAccordion";
import { StartSession } from "~/components/StartSession";
import UpNext from "~/components/UpNext";
import { db } from "~/database/config.server";
import { beers, sessionBeers, sessionCriteria } from "~/database/schema.server";
import type { SelectBeers } from "~/database/schema.types";
import {
	isActiveSessionParticipant,
	requireSessionViewer,
} from "~/database/utils/assertSessionAccess.server";
import { getSessionProgress } from "~/database/utils/getSessionProgress.server";
import {
	getOneBeerRanking,
	getPersonalBarList,
} from "~/database/utils/oneBeer.server";
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

	const user = await requireSessionViewer(request, sessionId);

	const sessionProgress = await getSessionProgress({ request, sessionId });
	// Handle not-found shape without assuming the property exists on the success type
	if ("statusCode" in sessionProgress && sessionProgress.statusCode === 404) {
		throw errorJson(404, { errorCode: ERROR_CODES.SESSION_NOT_FOUND });
	}

	if (sessionProgress.status === SessionStatus.finished) {
		return redirect("view");
	}

	const oneBeer =
		sessionProgress.mode === SessionMode.oneBeer
			? {
					ranking: await getOneBeerRanking(sessionId),
					personalList: await getPersonalBarList(sessionId, user.id),
					canPlace: await isActiveSessionParticipant(sessionId, user.id),
				}
			: null;

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
		oneBeer,
	};
}

export default function Session() {
	const { user, sessionProgress, criteria, sessionBeers, oneBeer } =
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

	if (oneBeer) {
		return (
			<OneBeerSession user={user} session={sessionProgress} {...oneBeer} />
		);
	}

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

			<RankedAccordion
				items={sessionProgress.ratedBeers}
				getKey={(beer) => beer.beerId}
				renderCard={(beer, rank) => (
					<BeerCard session={sessionProgress} beer={beer} rank={rank} />
				)}
				renderPanel={(beer) => <BeerCardDetails beer={beer} />}
			/>
		</>
	);
}
