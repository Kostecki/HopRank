import { and, eq } from "drizzle-orm";
import { data, redirect } from "react-router";

import { SessionMode, SessionUserExitReason } from "~/types/session";
import type { SessionUser } from "~/types/user";

import { userSessionGet } from "~/auth/users.server";
import { getViewGrants } from "~/auth/viewGrants.server";
import { ERROR_CODES, errorJson } from "~/utils/errors";

import { db } from "../config.server";
import { sessions, sessionUsers } from "../schema.server";
import type { SelectSessions } from "../schema.types";

const forbidden = (message: string) => data({ message }, { status: 403 });

export async function isActiveSessionParticipant(
	sessionId: number,
	userId: number,
) {
	const membership = await db.query.sessionUsers.findFirst({
		where: and(
			eq(sessionUsers.sessionId, sessionId),
			eq(sessionUsers.userId, userId),
			eq(sessionUsers.active, true),
		),
	});

	return !!membership;
}

/** Throws a 403 unless the user is a currently-active participant in the session. */
export async function requireSessionParticipant(
	sessionId: number,
	userId: number,
) {
	if (!(await isActiveSessionParticipant(sessionId, userId))) {
		throw forbidden("Du er ikke en del af denne smagning");
	}
}

/** Throws a 400 for One Beer sessions, which have no beer queue or scores. */
export async function requireNormalSession(sessionId: number) {
	const session = await db.query.sessions.findFirst({
		where: eq(sessions.id, sessionId),
		columns: { mode: true },
	});

	if (session?.mode === SessionMode.oneBeer) {
		throw data(
			{ message: "Det kan man ikke i en One Beer-smagning" },
			{ status: 400 },
		);
	}
}

/** Throws a 403 unless the user created the session or is an admin. */
export function requireSessionOwnerOrAdmin(
	session: Pick<SelectSessions, "createdBy">,
	user: Pick<SessionUser, "id" | "admin">,
) {
	if (session.createdBy !== user.id && !user.admin) {
		throw forbidden("Kun ejeren af smagningen kan udføre denne handling");
	}
}

/**
 * Throws a 403 unless the user created the session or has ever had a
 * session_users row for it (active or not). Used to gate rejoining a
 * session by id, as opposed to a first-time join via join code.
 */
export async function requireSessionRejoinEligible(
	session: Pick<SelectSessions, "createdBy">,
	userId: number,
	sessionId: number,
) {
	if (session.createdBy === userId) return;

	const membership = await db.query.sessionUsers.findFirst({
		where: and(
			eq(sessionUsers.sessionId, sessionId),
			eq(sessionUsers.userId, userId),
		),
	});

	if (!membership) {
		throw forbidden("Du er ikke en del af denne smagning");
	}
}

/**
 * Whether the user may see the session: they created it, are or were a
 * participant (and weren't kicked), unlocked it with its join code after it
 * finished, or are an admin.
 */
export async function canViewSession(
	sessionId: number,
	user: Pick<SessionUser, "id" | "admin">,
	grantedSessionIds: number[] = [],
) {
	const session = await db.query.sessions.findFirst({
		where: eq(sessions.id, sessionId),
		columns: { createdBy: true },
	});

	if (!session) return false;
	if (user.admin || session.createdBy === user.id) return true;
	if (grantedSessionIds.includes(sessionId)) return true;

	const membership = await db.query.sessionUsers.findFirst({
		where: and(
			eq(sessionUsers.sessionId, sessionId),
			eq(sessionUsers.userId, user.id),
		),
		columns: { exitReason: true },
	});

	return (
		!!membership && membership.exitReason !== SessionUserExitReason.kicked
	);
}

/**
 * Redirects to login without a user, and throws a 404 when the user may not
 * see the session, so its existence isn't revealed. Returns the user.
 */
export async function requireSessionViewer(
	request: Request,
	sessionId: number,
) {
	const user = await userSessionGet(request);
	if (!user) {
		throw redirect("/auth/login");
	}

	const grants = await getViewGrants(request);
	if (!(await canViewSession(sessionId, user, grants))) {
		throw errorJson(404, { errorCode: ERROR_CODES.SESSION_NOT_FOUND });
	}

	return user;
}
