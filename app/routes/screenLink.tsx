import { eq } from "drizzle-orm";
import { redirect } from "react-router";

import type { Route } from "./+types/screenLink";

import { addViewGrant } from "~/auth/viewGrants.server";
import { db } from "~/database/config.server";
import { sessions } from "~/database/schema.server";
import { JOIN_CODE_PATTERN, normalizeJoinCode } from "~/utils/join";

/**
 * Opens a session's results view on this device without logging in or
 * joining, e.g. for a big screen during the session. Knowing the join code is
 * what grants access, the same as for joining.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
	const joinCode = normalizeJoinCode(params.joinCode);
	if (!JOIN_CODE_PATTERN.test(joinCode)) {
		throw new Response("Pinkoden er ugyldig", { status: 400 });
	}

	const session = await db.query.sessions.findFirst({
		where: eq(sessions.joinCode, joinCode),
		columns: { id: true },
	});
	if (!session) {
		throw new Response("Pinkoden er ikke gyldig", { status: 404 });
	}

	return redirect(`/sessions/${session.id}/view`, {
		headers: { "Set-Cookie": await addViewGrant(request, session.id) },
	});
}
