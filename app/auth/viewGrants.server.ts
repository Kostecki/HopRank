import { commitSession, getSession } from "./session.server";

const VIEW_GRANTS_KEY = "viewableSessionIds";
const MAX_GRANTS = 50;

/**
 * Finished sessions the user has unlocked with a join code. Entering the code
 * of a finished session doesn't add you as a participant, so this cookie entry
 * is what lets you open its results afterwards.
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
