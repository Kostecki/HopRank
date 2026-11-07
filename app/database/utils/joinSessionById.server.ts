import { and, eq } from "drizzle-orm";

import { SessionUserExitReason } from "~/types/session";

import { db } from "../config.server";
import { sessionUsers } from "../schema.server";

export async function joinSessionById({
	sessionId,
	userId,
}: {
	sessionId: number;
	userId: number;
}) {
	// Leave whatever session the user is currently active in, so they're only
	// active in one at a time. Inactive rows are left alone: they keep their
	// exit reason (kicked, left, or none for a session that finished).
	await db
		.update(sessionUsers)
		.set({ active: false, exitReason: SessionUserExitReason.left })
		.where(
			and(eq(sessionUsers.userId, userId), eq(sessionUsers.active, true)),
		);

	// Insert or update the session user to be active in the specified session
	await db
		.insert(sessionUsers)
		.values({ sessionId, userId, active: true })
		.onConflictDoUpdate({
			target: [sessionUsers.sessionId, sessionUsers.userId],
			set: { active: true, exitReason: null },
		});
}
