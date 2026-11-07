import { createCookieSessionStorage } from "react-router";

import { invariant } from "~/utils/invariant";

const VIEW_GRANTS_KEY = "viewableSessionIds";
const MAX_GRANTS = 50;

const SESSION_SECRET = process.env.SESSION_SECRET;
invariant(SESSION_SECRET, "SESSION_SECRET must be set in .env");

// Its own cookie, separate from the login session, so a big screen stays
// unlocked longer than a login lasts.
const { getSession, commitSession } = createCookieSessionStorage({
	cookie: {
		name: "_view_grants",
		maxAge: 60 * 60 * 48, // 48 hours
		sameSite: "lax",
		path: "/",
		httpOnly: true,
		secrets: [SESSION_SECRET],
		secure: process.env.NODE_ENV === "production",
	},
});

/**
 * Sessions this device has unlocked with a join code: finished sessions opened
 * by code (which doesn't add you as a participant), and sessions opened with
 * the /v/:joinCode screen link.
 */
export async function getViewGrants(request: Request): Promise<number[]> {
	const session = await getSession(request.headers.get("Cookie"));
	const grants: unknown = session.get(VIEW_GRANTS_KEY);

	return Array.isArray(grants)
		? grants.filter((id): id is number => Number.isSafeInteger(id))
		: [];
}

/** Returns a Set-Cookie header value that adds the session to the grants. */
export async function addViewGrant(request: Request, sessionId: number) {
	const session = await getSession(request.headers.get("Cookie"));
	const grants = await getViewGrants(request);

	const updated = [sessionId, ...grants.filter((id) => id !== sessionId)];
	session.set(VIEW_GRANTS_KEY, updated.slice(0, MAX_GRANTS));

	return commitSession(session);
}
