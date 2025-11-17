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
  await db
    .update(sessionUsers)
    .set({ active: false })
    .where(eq(sessionUsers.userId, userId));

  await db
    .insert(sessionUsers)
    .values({ sessionId, userId, active: true })
    .onConflictDoUpdate({
      target: [sessionUsers.sessionId, sessionUsers.userId],
      set: { active: true },
    });
}
