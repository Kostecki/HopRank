import { redirect } from "react-router";
import { Authenticator } from "remix-auth";
import { TOTPStrategy } from "remix-auth-totp";

import type { SessionUser } from "~/types/user";

import type { SelectUsers } from "~/database/schema.types";
import { findOrCreateUserByEmail } from "~/database/utils/findOrCreateUserByEmail.server";
import { env } from "~/utils/env.server";
import { isSafeRedirect } from "~/utils/utils";

import { sendMagicLinkEmail } from "./email.server";
import { consumePendingRedirect } from "./pending-redirect.server";
import { commitSession, getSession } from "./session.server";
import { UntappdStrategy } from "./untappd-strategy.server";

export const authenticator = new Authenticator<SessionUser>();

export const isUntappdUser = (user: SessionUser) => {
	return !!user.untappd;
};

const toSessionUserBase = (user: SelectUsers) => ({
	id: user.id,
	email: user.email,
	admin: user.admin,
	name: user.name,
	untappdId: user.untappdId,
	username: user.username,
	avatarURL: user.avatarURL,
	createdAt: user.createdAt,
	lastUpdatedAt: user.lastUpdatedAt,
});

const commitSessionUser = async (request: Request, user: SessionUser) => {
	const session = await getSession(request.headers.get("Cookie"));
	session.set("user", user);

	let redirectTarget = "/sessions";
	const redirectTo = session.get("redirectTo");
	if (isSafeRedirect(redirectTo)) {
		redirectTarget = redirectTo as string;
		session.unset("redirectTo");
	}

	const sessionCookie = await commitSession(session);

	throw redirect(redirectTarget, {
		headers: {
			"Set-Cookie": sessionCookie,
		},
	});
};

authenticator.use(
	new TOTPStrategy<SessionUser>(
		{
			secret: env.TOTP_SECRET,
			totpGeneration: {
				digits: 6,
				charSet: "0123456789",
				period: 300,
				algorithm: "SHA-256",
			},
			emailSentRedirect: "/auth/totp",
			magicLinkPath: "/auth/totp",
			successRedirect: "/sessions",
			failureRedirect: "/auth/totp",
			cookieOptions: {
				...(env.NODE_ENV === "production" ? { secure: true } : {}),
			},
			sendTOTP: async ({ email, code, magicLink }) => {
				const redirectTo = await consumePendingRedirect(email);
				const url = new URL(magicLink, env.APP_URL);
				if (redirectTo && isSafeRedirect(redirectTo)) {
					url.searchParams.set("redirect_to", redirectTo);
				}

				await sendMagicLinkEmail({ email, code, magicLink: url.toString() });
			},
		},
		async ({ email, request }) => {
			const user = await findOrCreateUserByEmail(email);
			const sessionUser = toSessionUserBase(user);

			return await commitSessionUser(request, sessionUser);
		},
	),
	"TOTP",
);

// UNTAPPD_REDIRECT_URL is the single redirect_url registered in Untappd's app
// settings: always the production callback, in every environment. See
// untappd-strategy.server.ts for how dev gets relayed through it.

authenticator.use(
	new UntappdStrategy<SessionUser>(
		{
			clientID: env.UNTAPPD_CLIENT_ID,
			clientSecret: env.UNTAPPD_CLIENT_SECRET,
			callbackURL: env.UNTAPPD_REDIRECT_URL,
			appURL: env.APP_URL,
		},
		async ({ profile, accessToken, request }) => {
			const { untappdId, email, firstName, lastName, userName, avatar } =
				profile;
			const fullName = `${firstName} ${lastName}`;

			const user = await findOrCreateUserByEmail(
				email,
				untappdId,
				userName,
				fullName,
				avatar,
			);
			const sessionUser = {
				...toSessionUserBase(user),
				untappd: {
					id: untappdId,
					username: userName,
					accessToken,
					name: fullName,
					avatar,
				},
			};

			return await commitSessionUser(request, sessionUser);
		},
	),
	"Untappd",
);
