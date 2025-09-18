import { Paper, Tabs } from "@mantine/core";
import { and, count, eq } from "drizzle-orm";
import { redirect, useLoaderData, useRevalidator } from "react-router";

import NewSession from "~/components/NewSession";
import SessionPinInput from "~/components/SessionPinInput";
import SessionsTable from "~/components/SessionsTable";

import { userSessionGet } from "~/auth/users.server";
import { db } from "~/database/config.server";
import {
	criteria,
	sessionBeers,
	sessionState,
	sessionUsers,
	sessions,
} from "~/database/schema.server";

import { useDebouncedSocketEvent } from "~/hooks/useDebouncedSocketEvent";

import { getPageTitle } from "~/utils/utils";

import { SessionStatus } from "~/types/session";
import type { Route } from "./+types";

export function meta() {
	return [{ title: getPageTitle("Smagninger") }];
}

export async function loader({ request }: Route.LoaderArgs) {
	const user = await userSessionGet(request);
	if (!user) {
		return redirect("/auth/login");
	}

	// Check if the user is already in an active session and redirect
	const currentUserSession = await db.query.sessionUsers.findFirst({
		where: and(eq(sessionUsers.userId, user.id), eq(sessionUsers.active, true)),
	});
	if (currentUserSession) {
		const sessionId = currentUserSession.sessionId;
		return redirect(`/sessions/${sessionId}`);
	}

	const allCriteria = await db.select().from(criteria);

	const createdSessions = await db
		.select()
		.from(sessions)
		.where(eq(sessions.createdBy, user.id));

	const joined = await db
		.select()
		.from(sessionUsers)
		.innerJoin(sessions, eq(sessionUsers.sessionId, sessions.id))
		.where(eq(sessionUsers.userId, user.id));

	const sessionMap = new Map<number, typeof sessions.$inferSelect>();
	for (const s of [...createdSessions, ...joined.map((j) => j.sessions)]) {
		sessionMap.set(s.id, s);
	}
	const allSessions = Array.from(sessionMap.values());

	const sessionSummaries = await Promise.all(
		allSessions.map(async (session) => {
			const [state, participantCount, beerCount] = await Promise.all([
				db.query.sessionState.findFirst({
					where: eq(sessionState.sessionId, session.id),
				}),
				db
					.select({ count: count() })
					.from(sessionUsers)
					.where(
						and(
							eq(sessionUsers.sessionId, session.id),
							eq(sessionUsers.active, true),
						),
					),

				db
					.select({ count: count() })
					.from(sessionBeers)
					.where(eq(sessionBeers.sessionId, session.id)),
			]);

			return {
				id: session.id,
				name: session.name,
				joinCode: session.joinCode,
				participants: participantCount[0].count ?? 0,
				beers: beerCount[0].count ?? 0,
				status: state?.status,
				createdAt: session.createdAt,
				createdBy: session.createdBy,
			};
		}),
	);

	return {
		criteria: allCriteria,
		sessionSummaries,
	};
}

export default function Sessions() {
	const { criteria, sessionSummaries } = useLoaderData<typeof loader>();
	const { revalidate } = useRevalidator();

	const activeUserSessionIds = sessionSummaries
		.filter((s) => s.status === SessionStatus.active)
		.map((s) => s.id);

	useDebouncedSocketEvent(
		[
			"sessions:created",
			"sessions:deleted",
			"sessions:users-changed",
			"sessions:beer-changed",
		],
		(payload: { sessionId: number }) => {
			// Revalidate if event is global or if the sessionId is in the active sessions
			if (!payload || activeUserSessionIds.includes(payload.sessionId)) {
				revalidate();
			}
		},
	);

	const activeSessions = sessionSummaries.filter(
		(s) => s.status === SessionStatus.active,
	);
	const finishedSessions = sessionSummaries.filter(
		(s) => s.status === SessionStatus.finished,
	);

	return (
		<Paper p="md" radius="md" withBorder>
			<SessionPinInput mt="md" mb={50} />

			<Tabs defaultValue="active" color="slateIndigo">
				<Tabs.List mb="sm" grow justify="center">
					<Tabs.Tab value="active" fw="bold">
						Aktive
					</Tabs.Tab>
					<Tabs.Tab value="past" fw="bold">
						Afsluttede
					</Tabs.Tab>
				</Tabs.List>

				<Tabs.Panel value="active">
					<SessionsTable sessions={activeSessions} mode="active" />
				</Tabs.Panel>

				<Tabs.Panel value="past">
					<SessionsTable sessions={finishedSessions} mode="finished" />
				</Tabs.Panel>
			</Tabs>

			<NewSession criteria={criteria} />
		</Paper>
	);
}
