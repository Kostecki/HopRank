import { eq } from "drizzle-orm";
import { sessionUsers } from "../schema.server";
import { db } from "../config.server";

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
