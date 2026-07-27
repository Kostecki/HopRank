import { eq, sql } from "drizzle-orm";

import { db } from "../config.server";
import { sessionState } from "../schema.server";

export const bumpLastUpdatedAt = async (sessionId: number) => {
  try {
    await db
      .update(sessionState)
      .set({ lastUpdatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(sessionState.sessionId, sessionId));
  } catch (error) {
    console.error("Error bumping last updated at:", error);
    throw new Error("Failed to bump last updated at");
  }
};
