import { and, eq } from "drizzle-orm";

import type { BarSelection, VenueDetails } from "~/types/oneBeer";
import { SessionBeerStatus, SessionStatus } from "~/types/session";

import { findDuplicateBar } from "~/utils/oneBeerRanking";

import { db, type Transaction } from "../../config.server";
import {
	barPlacements,
	sessionBars,
	sessionState,
	sessions,
	sessionUsers,
} from "../../schema.server";
import type { SelectSessionBars } from "../../schema.types";
import { bumpLastUpdatedAt } from "../bumpLastUpdatedAt.server";
import {
	checkActiveSession,
	checkUnfinishedSession,
	cleanBarInput,
	fail,
	getBars,
	hasStarted,
	normalizeName,
	type Result,
} from "./shared.server";

/** Opens the next bar in the queue, unless one is already open. */
const openNextBar = (tx: Transaction, sessionId: number) => {
	const bars = getBars(tx, sessionId);
	if (bars.some((bar) => bar.status === SessionBeerStatus.rating)) return;

	const next = bars.find((bar) => bar.status === SessionBeerStatus.waiting);
	if (!next) return;

	tx.update(sessionBars)
		.set({ status: SessionBeerStatus.rating })
		.where(eq(sessionBars.id, next.id))
		.run();
};

const advance = (tx: Transaction, sessionId: number) => {
	const current = getBars(tx, sessionId).find(
		(bar) => bar.status === SessionBeerStatus.rating,
	);

	if (!current) {
		openNextBar(tx, sessionId);
		return;
	}

	const activeUsers = tx
		.select({ userId: sessionUsers.userId })
		.from(sessionUsers)
		.where(
			and(eq(sessionUsers.sessionId, sessionId), eq(sessionUsers.active, true)),
		)
		.all();

	// Nobody left to place it: .every() below would otherwise finish the bar
	// on an empty list.
	if (activeUsers.length === 0) return;

	const placedBy = new Set(
		tx
			.select({ userId: barPlacements.userId })
			.from(barPlacements)
			.where(eq(barPlacements.barId, current.id))
			.all()
			.map((placement) => placement.userId),
	);

	if (!activeUsers.every(({ userId }) => placedBy.has(userId))) return;

	tx.update(sessionBars)
		.set({ status: SessionBeerStatus.rated })
		.where(eq(sessionBars.id, current.id))
		.run();

	openNextBar(tx, sessionId);
};

const MAX_SYNCED_VENUES = 100;

/**
 * Brings a saved bar up to date with fresher venue data. Blank values are
 * ignored, so a gap in Untappd's data can't erase what we have, and so is a new
 * name another bar in the session already uses. Returns whether anything changed.
 */
const applyVenueUpdate = (
	tx: Transaction,
	bars: SelectSessionBars[],
	input: BarSelection,
) => {
	const venue = cleanBarInput(input);
	const bar = venue?.foursquareId
		? bars.find((b) => b.foursquareId === venue.foursquareId)
		: undefined;

	if (!venue || !bar) return false;

	const { name, foursquareId: _, ...details } = venue;
	const changes: Partial<SelectSessionBars> = {};

	for (const [key, value] of Object.entries(details) as [
		keyof VenueDetails,
		string | number | null,
	][]) {
		if (value !== null && value !== bar[key]) {
			Object.assign(changes, { [key]: value });
		}
	}

	const isNameTaken = bars.some(
		(b) => b.id !== bar.id && normalizeName(b.name) === normalizeName(name),
	);
	if (name !== bar.name && !isNameTaken) changes.name = name;

	if (Object.keys(changes).length === 0) return false;

	tx.update(sessionBars).set(changes).where(eq(sessionBars.id, bar.id)).run();
	return true;
};

/**
 * Compares venue data from Untappd with the session's saved bars and updates
 * the ones that differ. Returns how many changed. Finished sessions are left
 * as they were.
 */
export function syncVenueDetails(sessionId: number, venues: BarSelection[]) {
	if (!Array.isArray(venues)) return 0;

	return db.transaction((tx) => {
		if (checkUnfinishedSession(tx, sessionId)) return 0;

		const bars = getBars(tx, sessionId);

		return venues
			.slice(0, MAX_SYNCED_VENUES)
			.filter((venue) => typeof venue?.name === "string")
			.filter((venue) => applyVenueUpdate(tx, bars, venue)).length;
	});
}

/** Finishes the current bar once every active participant has placed it. */
export function advanceBars(sessionId: number, tx?: Transaction) {
	if (!tx) {
		db.transaction((t) => advanceBars(sessionId, t));
		return;
	}

	if (checkActiveSession(tx, sessionId)) return;
	advance(tx, sessionId);
}

/** Starts the session and opens the first bar, if one was added up front. */
export function startOneBeerSession(sessionId: number) {
	db.transaction((tx) => {
		tx.update(sessionState)
			.set({ status: SessionStatus.active })
			.where(eq(sessionState.sessionId, sessionId))
			.run();

		openNextBar(tx, sessionId);
	});
}

export function addBar(
	sessionId: number,
	userId: number,
	input: BarSelection,
): Result {
	const bar = cleanBarInput(input);
	if (!bar) return fail(400, "Baren skal have et navn");

	return db.transaction((tx): Result => {
		const invalid = checkUnfinishedSession(tx, sessionId);
		if (invalid) return invalid;

		const bars = getBars(tx, sessionId);

		const duplicate = findDuplicateBar(bars, bar);
		if (duplicate) {
			// Not added, but this is fresh data about a bar we already have.
			applyVenueUpdate(tx, bars, bar);

			return fail(409, `${duplicate.name} er allerede på listen`);
		}

		// Before the start there's room for the first bar only. It waits there
		// until startOneBeerSession opens it.
		const started = hasStarted(tx, sessionId);
		if (!started && bars.length > 0) {
			return fail(400, "Den næste bar kan tilføjes, når smagningen er startet");
		}

		// Order keeps counting up from the highest remaining bar, so the queue
		// stays in the order bars were added, even after one is removed.
		const order = Math.max(0, ...bars.map((b) => b.order)) + 1;

		tx.insert(sessionBars)
			.values({ sessionId, addedByUserId: userId, order, ...bar })
			.run();

		if (started) openNextBar(tx, sessionId);
		bumpLastUpdatedAt(sessionId, tx);

		return { ok: true };
	});
}

/** Links a bar typed by hand to a venue found through search. */
export function correctBar(
	sessionId: number,
	barId: number,
	input: BarSelection,
): Result {
	const bar = cleanBarInput(input);
	if (!bar?.foursquareId) return fail(400, "Vælg en bar fra søgningen");

	return db.transaction((tx): Result => {
		const invalid = checkUnfinishedSession(tx, sessionId);
		if (invalid) return invalid;

		const bars = getBars(tx, sessionId);

		const target = bars.find((b) => b.id === barId);
		if (!target) return fail(404, "Baren findes ikke");
		if (target.foursquareId) return fail(409, "Baren er allerede rettet");

		const duplicate = findDuplicateBar(bars, bar, barId);
		if (duplicate) {
			return fail(409, `${duplicate.name} er allerede på listen`);
		}

		tx.update(sessionBars).set(bar).where(eq(sessionBars.id, barId)).run();
		bumpLastUpdatedAt(sessionId, tx);

		return { ok: true };
	});
}

export function removeBar(
	sessionId: number,
	barId: number,
	actor: { id: number; admin: boolean },
): Result {
	return db.transaction((tx): Result => {
		const invalid = checkUnfinishedSession(tx, sessionId);
		if (invalid) return invalid;

		const session = tx
			.select({ createdBy: sessions.createdBy })
			.from(sessions)
			.where(eq(sessions.id, sessionId))
			.get();

		const target = getBars(tx, sessionId).find((b) => b.id === barId);
		if (!target) return fail(404, "Baren findes ikke");
		if (target.status === SessionBeerStatus.rated) {
			return fail(409, "En færdigrangeret bar kan ikke fjernes");
		}

		// The queue is shared, so anyone in the session can take a bar off it.
		const isQueued = target.status === SessionBeerStatus.waiting;
		const canAlwaysRemove =
			isQueued || actor.admin || session?.createdBy === actor.id;

		if (!canAlwaysRemove) {
			if (target.addedByUserId !== actor.id) {
				return fail(403, "Du kan kun fjerne barer, du selv har tilføjet");
			}

			const placement = tx
				.select({ id: barPlacements.id })
				.from(barPlacements)
				.where(eq(barPlacements.barId, barId))
				.get();
			if (placement) {
				return fail(409, "Baren er allerede blevet rangeret");
			}
		}

		tx.delete(barPlacements).where(eq(barPlacements.barId, barId)).run();
		tx.delete(sessionBars).where(eq(sessionBars.id, barId)).run();

		if (hasStarted(tx, sessionId)) openNextBar(tx, sessionId);
		bumpLastUpdatedAt(sessionId, tx);

		return { ok: true };
	});
}

/**
 * Sets the order of the bars coming up. The list must hold exactly the bars in
 * the queue, so a page that's behind can't undo someone else's change.
 */
export function reorderQueue(
	sessionId: number,
	orderedBarIds: number[],
): Result {
	if (!Array.isArray(orderedBarIds)) return fail(400, "Ugyldig rækkefølge");

	return db.transaction((tx): Result => {
		const invalid = checkActiveSession(tx, sessionId);
		if (invalid) return invalid;

		const queued = getBars(tx, sessionId).filter(
			(bar) => bar.status === SessionBeerStatus.waiting,
		);
		const queuedIds = new Set(queued.map((bar) => bar.id));

		const isSameBars =
			orderedBarIds.length === queued.length &&
			new Set(orderedBarIds).size === queued.length &&
			orderedBarIds.every((barId) => queuedIds.has(barId));

		if (!isSameBars) {
			return fail(409, "Listen er ændret. Prøv igen");
		}

		// Reuses the queue's own order values, so it stays behind the bars that
		// have already been opened.
		orderedBarIds.forEach((barId, index) => {
			tx.update(sessionBars)
				.set({ order: queued[index].order })
				.where(eq(sessionBars.id, barId))
				.run();
		});

		bumpLastUpdatedAt(sessionId, tx);

		return { ok: true };
	});
}

/**
 * Replaces a person's whole list. It must hold every bar they have already
 * placed, and nothing else apart from the bar that is open right now, so a
 * list from a stale page can't lose or invent placements.
 */
export function savePlacements(
	sessionId: number,
	userId: number,
	orderedBarIds: number[],
): Result {
	const isValidList =
		Array.isArray(orderedBarIds) &&
		orderedBarIds.length > 0 &&
		orderedBarIds.every(Number.isInteger) &&
		new Set(orderedBarIds).size === orderedBarIds.length;

	if (!isValidList) return fail(400, "Ugyldig rangering");

	return db.transaction((tx): Result => {
		const invalid = checkActiveSession(tx, sessionId);
		if (invalid) return invalid;

		const current = getBars(tx, sessionId).find(
			(bar) => bar.status === SessionBeerStatus.rating,
		);
		const placedBarIds = tx
			.select({ barId: barPlacements.barId })
			.from(barPlacements)
			.where(
				and(
					eq(barPlacements.sessionId, sessionId),
					eq(barPlacements.userId, userId),
				),
			)
			.all()
			.map((placement) => placement.barId);

		const submitted = new Set(orderedBarIds);
		const allowed = new Set(placedBarIds);
		if (current) allowed.add(current.id);

		const isCurrentList =
			placedBarIds.every((barId) => submitted.has(barId)) &&
			orderedBarIds.every((barId) => allowed.has(barId));

		if (!isCurrentList) {
			return fail(409, "Listen er ændret. Tjek den og gem igen");
		}

		tx.delete(barPlacements)
			.where(
				and(
					eq(barPlacements.sessionId, sessionId),
					eq(barPlacements.userId, userId),
				),
			)
			.run();

		tx.insert(barPlacements)
			.values(
				orderedBarIds.map((barId, index) => ({
					sessionId,
					barId,
					userId,
					position: index + 1,
				})),
			)
			.run();

		advance(tx, sessionId);
		bumpLastUpdatedAt(sessionId, tx);

		return { ok: true };
	});
}
