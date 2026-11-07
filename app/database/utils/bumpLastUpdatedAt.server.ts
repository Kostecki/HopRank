import { eq, sql } from "drizzle-orm";

import { db, type Executor } from "../config.server";
import { sessionState } from "../schema.server";

/** Marks the session as active now, for the idle-session cleanup. */
export const bumpLastUpdatedAt = (
	sessionId: number,
	executor: Executor = db,
) => {
	executor
		.update(sessionState)
		.set({ lastUpdatedAt: sql`CURRENT_TIMESTAMP` })
		.where(eq(sessionState.sessionId, sessionId))
		.run();
};
