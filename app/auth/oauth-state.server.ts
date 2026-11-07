import { createCookieSessionStorage } from "react-router";

import { env } from "~/utils/env.server";

// Short-lived, single-purpose cookie for the Untappd OAuth CSRF `state`
// value. Kept separate from the main user session cookie since it's only
// needed for the few minutes between redirecting to Untappd and the
// callback coming back.
const maxAge = 60 * 10; // 10 minutes

export const {
	getSession: getOAuthStateSession,
	commitSession: commitOAuthStateSession,
	destroySession: destroyOAuthStateSession,
} = createCookieSessionStorage({
	cookie: {
		name: "_oauth_state",
		maxAge,
		sameSite: "lax",
		path: "/",
		httpOnly: true,
		secrets: [env.SESSION_SECRET],
		secure: env.NODE_ENV === "production",
	},
});
