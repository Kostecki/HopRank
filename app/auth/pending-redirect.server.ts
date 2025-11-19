import { eq } from "drizzle-orm";

import { db } from "~/database/config.server";
import { pendingRedirects } from "~/database/schema.server";

const TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function setPendingRedirect(email: string, value: string) {
  const expiresAt = Date.now() + TTL_MS;

  await db
    .insert(pendingRedirects)
    .values({
      email: email.toLowerCase(),
      redirectTo: value,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: pendingRedirects.email,
      set: {
        redirectTo: value,
        expiresAt,
      },
    });
}

export async function consumePendingRedirect(email: string) {
  const result = await db.query.pendingRedirects.findFirst({
    where: eq(pendingRedirects.email, email.toLowerCase()),
  });

  if (!result || result.expiresAt < Date.now()) {
    await db
      .delete(pendingRedirects)
      .where(eq(pendingRedirects.email, email.toLowerCase()));

    return null;
  }

  await db
    .delete(pendingRedirects)
    .where(eq(pendingRedirects.email, email.toLowerCase()));

  return result.redirectTo;
}
