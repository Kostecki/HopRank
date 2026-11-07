// Guards, input cleaning and transaction helpers shared by the One Beer
// mutations and queries.
import { asc, eq } from "drizzle-orm";

import type { BarSelection, VenueDetails } from "~/types/oneBeer";
import { SessionMode, SessionStatus } from "~/types/session";

import type { Transaction } from "../../config.server";
import { sessionBars, sessionState, sessions } from "../../schema.server";

export type Result =
	| { ok: true }
	| { ok: false; status: 400 | 403 | 404 | 409; message: string };

export const MAX_BAR_NAME_LENGTH = 100;

export const fail = (
	status: 400 | 403 | 404 | 409,
	message: string,
): Extract<Result, { ok: false }> => ({ ok: false, status, message });

export const normalizeName = (name: string) =>
	name.trim().toLocaleLowerCase("da");

export const cleanText = (value: unknown, maxLength = 200) =>
	typeof value === "string" && value.trim()
		? value.trim().slice(0, maxLength)
		: null;

export const cleanCoordinate = (value: unknown, limit: number) =>
	typeof value === "number" && Math.abs(value) <= limit ? value : null;

// The details come from the browser.
export const cleanVenueDetails = (input: BarSelection): VenueDetails => ({
	address: cleanText(input.address),
	city: cleanText(input.city),
	category: cleanText(input.category),
	lat: cleanCoordinate(input.lat, 90),
	lng: cleanCoordinate(input.lng, 180),
});

export const cleanBarInput = (input: BarSelection) => {
	const name = input.name.trim();
	if (!name || name.length > MAX_BAR_NAME_LENGTH) return null;

	const foursquareId = input.foursquareId || null;

	// A bar typed by hand has no venue, so there's nothing to describe it with.
	return {
		name,
		foursquareId,
		...cleanVenueDetails(foursquareId ? input : ({} as BarSelection)),
	};
};

export const getBars = (tx: Transaction, sessionId: number) =>
	tx
		.select()
		.from(sessionBars)
		.where(eq(sessionBars.sessionId, sessionId))
		.orderBy(asc(sessionBars.order))
		.all();

export const getSessionWithState = (tx: Transaction, sessionId: number) =>
	tx
		.select({ mode: sessions.mode, status: sessionState.status })
		.from(sessions)
		.innerJoin(sessionState, eq(sessionState.sessionId, sessions.id))
		.where(eq(sessions.id, sessionId))
		.get();

export const checkOneBeerSession = (
	tx: Transaction,
	sessionId: number,
	allowedStatuses: string[],
) => {
	const session = getSessionWithState(tx, sessionId);

	if (!session) return fail(404, "Smagningen findes ikke");
	if (session.mode !== SessionMode.oneBeer) {
		return fail(400, "Smagningen er ikke en One Beer-smagning");
	}
	if (!allowedStatuses.includes(session.status)) {
		return fail(400, "Smagningen er ikke i gang");
	}
	return null;
};

/** Fails unless this is a running One Beer session. */
export const checkActiveSession = (tx: Transaction, sessionId: number) =>
	checkOneBeerSession(tx, sessionId, [SessionStatus.active]);

/** Fails unless this One Beer session is running or waiting to start. */
export const checkUnfinishedSession = (tx: Transaction, sessionId: number) =>
	checkOneBeerSession(tx, sessionId, [
		SessionStatus.created,
		SessionStatus.active,
	]);

export const hasStarted = (tx: Transaction, sessionId: number) =>
	getSessionWithState(tx, sessionId)?.status === SessionStatus.active;
