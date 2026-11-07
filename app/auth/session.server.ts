import { createCookieSessionStorage } from "react-router";

import { env } from "~/utils/env.server";

const maxAge = 60 * 60 * 24; // 24 hours

export const { getSession, commitSession, destroySession } =
	createCookieSessionStorage({
		cookie: {
			name: "_session",
			maxAge,
			sameSite: "lax",
			path: "/",
			httpOnly: true,
			secrets: [env.SESSION_SECRET],
			secure: env.NODE_ENV === "production",
		},
	});
