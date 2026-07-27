import { createCookieSessionStorage } from "react-router";

import { invariant } from "~/utils/invariant";

// Short-lived, single-purpose cookie for the Untappd OAuth CSRF `state`
// value. Kept separate from the main user session cookie since it's only
// needed for the few minutes between redirecting to Untappd and the
// callback coming back.
const maxAge = 60 * 10; // 10 minutes

const SESSION_SECRET = process.env.SESSION_SECRET;
invariant(SESSION_SECRET, "SESSION_SECRET must be set in .env");

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
    secrets: [SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});
