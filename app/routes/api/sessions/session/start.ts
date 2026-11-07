import { and, asc, eq } from "drizzle-orm";
import { data } from "react-router";

import { SessionBeerStatus, SessionMode, SessionStatus } from "~/types/session";
import type { Route } from "./+types/start";

import { requireUser } from "~/auth/requireUser.server";
import { db } from "~/database/config.server";
import { sessionBeers, sessionState, sessions } from "~/database/schema.server";
import { requireSessionOwnerOrAdmin } from "~/database/utils/assertSessionAccess.server";
import { startOneBeerSession } from "~/database/utils/oneBeer.server";
import { shuffleBeersInSession } from "~/database/utils/shuffleBeersInSession.server";
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

		const started = db.transaction((tx) => {
			const anyWaiting = tx
				.select({ id: sessionBeers.id })
				.from(sessionBeers)
				.where(
					and(
						eq(sessionBeers.sessionId, sessionId),
						eq(sessionBeers.status, SessionBeerStatus.waiting),
					),
				)
				.get();
			if (!anyWaiting) return false;

			shuffleBeersInSession(sessionId, tx);

			const first = tx
				.select()
				.from(sessionBeers)
				.where(
					and(
						eq(sessionBeers.sessionId, sessionId),
						eq(sessionBeers.status, SessionBeerStatus.waiting),
					),
				)
				.orderBy(asc(sessionBeers.order))
				.get();
			if (!first) return false;

			tx.update(sessionState)
				.set({
					status: SessionStatus.active,
					currentBeerId: first.beerId,
					currentBeerOrder: first.order,
				})
				.where(eq(sessionState.sessionId, sessionId))
				.run();

			tx.update(sessionBeers)
				.set({ status: SessionBeerStatus.rating })
				.where(eq(sessionBeers.id, first.id))
				.run();

			return true;
		});

		if (!started) {
			return data(
				{ message: "Der er ingen øl at starte med" },
				{ status: 400 },
			);
		}

		emitSessionEvent(sessionId, "session:started");

		return data({ success: true });
	} catch (error) {
		console.error("Error starting session:", error);
		return data({ message: "Fejl ved start af session" }, { status: 500 });
	}
}
