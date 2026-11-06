import { and, asc, eq, sql } from "drizzle-orm";

import type {
	BarSelection,
	OneBeerRanking,
	SessionBar,
	SessionBarList,
	VenueDetails,
} from "~/types/oneBeer";
import { SessionBeerStatus, SessionMode, SessionStatus } from "~/types/session";

import {
	findDuplicateBar,
	getBarStats,
	getPersonalPlacements,
	rankBars,
} from "~/utils/oneBeerRanking";

import { db } from "../config.server";
import {
	barPlacements,
	beers,
	sessionBars,
	sessionState,
	sessions,
	sessionUsers,
} from "../schema.server";
import type { SelectSessionBars } from "../schema.types";

type Result =
	| { ok: true }
	| { ok: false; status: 400 | 403 | 404 | 409; message: string };

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const MAX_BAR_NAME_LENGTH = 100;

const fail = (
	status: 400 | 403 | 404 | 409,
	message: string,
): Extract<Result, { ok: false }> => ({ ok: false, status, message });

const normalizeName = (name: string) => name.trim().toLocaleLowerCase("da");

const cleanText = (value: unknown, maxLength = 200) =>
	typeof value === "string" && value.trim()
		? value.trim().slice(0, maxLength)
		: null;

const cleanCoordinate = (value: unknown, limit: number) =>
	typeof value === "number" && Math.abs(value) <= limit ? value : null;

// The details come from the browser.
const cleanVenueDetails = (input: BarSelection): VenueDetails => ({
	address: cleanText(input.address),
	city: cleanText(input.city),
	category: cleanText(input.category),
	lat: cleanCoordinate(input.lat, 90),
	lng: cleanCoordinate(input.lng, 180),
});

const cleanBarInput = (input: BarSelection) => {
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

const getBars = (tx: Transaction, sessionId: number) =>
	tx
		.select()
		.from(sessionBars)
		.where(eq(sessionBars.sessionId, sessionId))
		.orderBy(asc(sessionBars.order))
		.all();

const getSessionWithState = (tx: Transaction, sessionId: number) =>
	tx
		.select({ mode: sessions.mode, status: sessionState.status })
		.from(sessions)
		.innerJoin(sessionState, eq(sessionState.sessionId, sessions.id))
		.where(eq(sessions.id, sessionId))
		.get();

const checkOneBeerSession = (
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
const checkActiveSession = (tx: Transaction, sessionId: number) =>
	checkOneBeerSession(tx, sessionId, [SessionStatus.active]);

/** Fails unless this One Beer session is running or waiting to start. */
const checkUnfinishedSession = (tx: Transaction, sessionId: number) =>
	checkOneBeerSession(tx, sessionId, [
		SessionStatus.created,
		SessionStatus.active,
	]);

const hasStarted = (tx: Transaction, sessionId: number) =>
	getSessionWithState(tx, sessionId)?.status === SessionStatus.active;

const bumpLastUpdated = (tx: Transaction, sessionId: number) => {
	tx.update(sessionState)
		.set({ lastUpdatedAt: sql`CURRENT_TIMESTAMP` })
		.where(eq(sessionState.sessionId, sessionId))
		.run();
};

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
export function advanceBars(sessionId: number) {
	db.transaction((tx) => {
		if (checkActiveSession(tx, sessionId)) return;
		advance(tx, sessionId);
	});
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
		bumpLastUpdated(tx, sessionId);

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
		bumpLastUpdated(tx, sessionId);

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
		bumpLastUpdated(tx, sessionId);

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

		bumpLastUpdated(tx, sessionId);

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
		bumpLastUpdated(tx, sessionId);

		return { ok: true };
	});
}

const toSessionBar = (
	bar: SelectSessionBars,
	placementCount: number,
	stopNumber: number,
): SessionBar => ({
	id: bar.id,
	name: bar.name,
	foursquareId: bar.foursquareId,
	address: bar.address,
	city: bar.city,
	category: bar.category,
	lat: bar.lat,
	lng: bar.lng,
	stopNumber,
	addedByUserId: bar.addedByUserId,
	status: bar.status,
	placementCount,
});

/** Every bar in the session, in queue order. */
export async function getSessionBars(sessionId: number): Promise<SessionBar[]> {
	const [bars, placements] = await Promise.all([
		db.query.sessionBars.findMany({
			where: eq(sessionBars.sessionId, sessionId),
			orderBy: asc(sessionBars.order),
		}),
		db.query.barPlacements.findMany({
			where: eq(barPlacements.sessionId, sessionId),
			columns: { barId: true },
		}),
	]);

	return bars.map((bar, index) =>
		toSessionBar(
			bar,
			placements.filter((p) => p.barId === bar.id).length,
			index + 1,
		),
	);
}

/** The group's view of the session: its ranking, open bar and queue. */
export async function getOneBeerRanking(
	sessionId: number,
): Promise<OneBeerRanking> {
	const session = await db.query.sessions.findFirst({
		where: eq(sessions.id, sessionId),
		columns: { beerId: true },
	});
	const [beer, bars, placements, activeUsers] = await Promise.all([
		session?.beerId
			? db.query.beers.findFirst({ where: eq(beers.id, session.beerId) })
			: undefined,
		getSessionBars(sessionId),
		db.query.barPlacements.findMany({
			where: eq(barPlacements.sessionId, sessionId),
		}),
		db.query.sessionUsers.findMany({
			where: and(
				eq(sessionUsers.sessionId, sessionId),
				eq(sessionUsers.active, true),
			),
			columns: { userId: true },
		}),
	]);

	const finishedBars = bars.filter(
		(bar) => bar.status === SessionBeerStatus.rated,
	);
	const finishedBarIds = finishedBars.map((bar) => bar.id);
	const stats = getBarStats(finishedBarIds, placements);
	const rankedBars = rankBars(finishedBarIds, placements).flatMap(
		({ barId, averagePosition }) => {
			const bar = finishedBars.find((b) => b.id === barId);
			return bar
				? [
						{
							...bar,
							averagePosition,
							placedByCount: 0,
							firstPlaceCount: 0,
							bestPosition: 0,
							worstPosition: 0,
							...stats.get(barId),
						},
					]
				: [];
		},
	);

	const current = bars.find((bar) => bar.status === SessionBeerStatus.rating);
	const activeUserIds = new Set(activeUsers.map((u) => u.userId));

	return {
		beer: beer ?? null,
		rankedBars,
		currentBar: current
			? {
					...current,
					placedCount: placements.filter(
						(p) => p.barId === current.id && activeUserIds.has(p.userId),
					).length,
					expectedCount: activeUsers.length,
				}
			: null,
		queuedBars: bars.filter((bar) => bar.status === SessionBeerStatus.waiting),
		personalPlacements: getPersonalPlacements(finishedBarIds, placements),
	};
}

/**
 * One person's own list, best bar first. An open bar they haven't placed yet
 * goes at the bottom.
 */
export async function getPersonalBarList(
	sessionId: number,
	userId: number,
): Promise<SessionBarList> {
	const [bars, placements] = await Promise.all([
		getSessionBars(sessionId),
		db.query.barPlacements.findMany({
			where: and(
				eq(barPlacements.sessionId, sessionId),
				eq(barPlacements.userId, userId),
			),
			orderBy: asc(barPlacements.position),
		}),
	]);

	const placed = placements.flatMap(({ barId }) => {
		const bar = bars.find((b) => b.id === barId);
		return bar ? [bar] : [];
	});

	const current = bars.find((bar) => bar.status === SessionBeerStatus.rating);
	const hasPlacedCurrent =
		!!current && placed.some((bar) => bar.id === current.id);

	return {
		bars: current && !hasPlacedCurrent ? [...placed, current] : placed,
		hasPlacedCurrent,
	};
}
