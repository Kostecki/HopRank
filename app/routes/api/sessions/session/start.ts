import { and, eq } from "drizzle-orm";
import { data } from "react-router";

import { SessionBeerStatus, SessionMode, SessionStatus } from "~/types/session";
import type { Route } from "./+types/start";

import { requireUser } from "~/auth/requireUser.server";
import { db } from "~/database/config.server";
import { sessionBeers, sessionState, sessions } from "~/database/schema.server";
import { requireSessionOwnerOrAdmin } from "~/database/utils/assertSessionAccess.server";
import { startOneBeerSession } from "~/database/utils/oneBeer.server";
import { shuffleBeersInSession } from "~/utils/shuffle";
import { extractSessionId } from "~/utils/utils";
import { emitSessionEvent } from "~/utils/websocket.server";

export async function action({ request, params }: Route.ActionArgs) {
	const sessionId = extractSessionId(params.sessionId);
	const user = await requireUser(request);

	const session = await db.query.sessions.findFirst({
		where: eq(sessions.id, sessionId),
	});

	if (!session) {
		return data({ message: "Session not found" }, { status: 404 });
	}

	requireSessionOwnerOrAdmin(session, user);

	const currentState = await db.query.sessionState.findFirst({
		where: eq(sessionState.sessionId, sessionId),
		columns: { status: true },
	});
	if (currentState?.status !== SessionStatus.created) {
		return data(
			{ message: "Smagningen er allerede startet eller afsluttet" },
			{ status: 400 },
		);
	}

	try {
		if (session.mode === SessionMode.oneBeer) {
			startOneBeerSession(sessionId);

			emitSessionEvent(sessionId, "session:started");
			return data({ success: true });
		}

		const anyWaiting = await db.query.sessionBeers.findFirst({
			where: and(
				eq(sessionBeers.sessionId, sessionId),
				eq(sessionBeers.status, SessionBeerStatus.waiting),
			),
			columns: { id: true },
		});
		if (!anyWaiting) {
			return data(
				{ message: "Der er ingen øl at starte med" },
				{ status: 400 },
			);
		}

		// Shuffle beers in session
		await shuffleBeersInSession(sessionId);

		// Set session status to active
		await db
			.update(sessionState)
			.set({ status: SessionStatus.active })
			.where(eq(sessionState.sessionId, sessionId));

		// If there is a current beer, emit started event and return
		const state = await db.query.sessionState.findFirst({
			where: eq(sessionState.sessionId, sessionId),
			columns: { currentBeerId: true },
		});
		if (state?.currentBeerId) {
			emitSessionEvent(sessionId, "session:started");
			return data({ success: true });
		}

		// Set the first waiting beer as the current beer
		const first = await db.query.sessionBeers.findFirst({
			where: and(
				eq(sessionBeers.sessionId, sessionId),
				eq(sessionBeers.status, SessionBeerStatus.waiting),
			),
			orderBy: (sb, { asc }) => asc(sb.order),
		});
		if (!first) {
			return data(
				{ message: "Der er ingen øl at starte med" },
				{ status: 400 },
			);
		}

		// Update session state with the first beer
		await db
			.update(sessionState)
			.set({
				currentBeerId: first.beerId,
				currentBeerOrder: first.order,
			})
			.where(eq(sessionState.sessionId, sessionId));

		// Update the first beer status to "rating"
		await db
			.update(sessionBeers)
			.set({ status: SessionBeerStatus.rating })
			.where(eq(sessionBeers.id, first.id));

		emitSessionEvent(sessionId, "session:started");

		return data({ success: true });
	} catch (error) {
		console.error("Error starting session:", error);
		return data({ message: "Fejl ved start af session" }, { status: 500 });
	}
}
