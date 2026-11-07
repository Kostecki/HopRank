import {
	type SessionProgressUser,
	SessionUserExitReason,
} from "~/types/session";

import type { SelectSessionUsers, SelectUsers } from "~/database/schema.types";

// This is the boundary that must never leak email/admin
// to SessionProgress.users, since that shape is returned to unauthenticated
// viewers on the public read-only results route.
export const toSessionProgressUser = (
	user: SelectUsers,
	sessionUser: Pick<SelectSessionUsers, "active" | "exitReason"> | undefined,
): SessionProgressUser => ({
	id: user.id,
	name: user.name,
	untappdId: user.untappdId,
	username: user.username,
	avatarURL: user.avatarURL,
	// Derived from exitReason alone (not the `active` flag): when a session
	// finishes, closeInactiveSessions marks every participant inactive without
	// setting exitReason, so relying on `active` here would make everyone who
	// simply stayed until the end look like they'd left/been kicked.
	status:
		sessionUser?.exitReason === SessionUserExitReason.kicked
			? "kicked"
			: sessionUser?.exitReason === SessionUserExitReason.left
				? "left"
				: "active",
});
