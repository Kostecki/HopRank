import type { SelectUsers } from "~/database/schema.types";

// Base public shape we expose throughout the app (derived from the Drizzle model to stay in sync).
export type UserPublic = Pick<
	SelectUsers,
	| "id"
	| "email"
	| "admin"
	| "name"
	| "untappdId"
	| "username"
	| "avatarURL"
	| "createdAt"
	| "lastUpdatedAt"
>;

// The Untappd account, as the browser may see it.
export type SessionUserUntappd = {
	id: number; // Untappd user id
	username: string;
	name: string; // Display name from Untappd
	avatar: string;
};

// The logged-in user, as loaders send it to the browser: no Untappd token.
export type SessionUser = UserPublic & {
	untappd?: SessionUserUntappd;
};

// The logged-in user as stored in the (httpOnly) session cookie. Only server
// code reads it; the access token never goes to the browser.
export type StoredSessionUser = UserPublic & {
	untappd?: SessionUserUntappd & { accessToken: string };
};

/** Drops the Untappd access token, for sending the user to the browser. */
export const toClientUser = (user: StoredSessionUser): SessionUser => {
	const { untappd, ...rest } = user;
	if (!untappd) return rest;

	const { accessToken: _accessToken, ...publicUntappd } = untappd;
	return { ...rest, untappd: publicUntappd };
};
