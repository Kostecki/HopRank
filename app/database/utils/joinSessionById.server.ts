import { eq } from "drizzle-orm";

import { db } from "../config.server";
import { sessionUsers } from "../schema.server";

export async function joinSessionById({
  sessionId,
  userId,
}: {
  sessionId: number;
  userId: number;
}) {
  // Set all other sessions for this user to inactive
  // This ensures the user is only active in one session at a time
  await db
    .update(sessionUsers)
    .set({ active: false })
    .where(eq(sessionUsers.userId, userId));

  // Insert or update the session user to be active in the specified session
  await db
    .insert(sessionUsers)
    .values({ sessionId, userId, active: true })
    .onConflictDoUpdate({
      target: [sessionUsers.sessionId, sessionUsers.userId],
      set: { active: true },
    });
}
