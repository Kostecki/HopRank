import { eq } from "drizzle-orm";

import { getSession } from "./session.server";
import type { SessionUser } from "./auth.server";
import { db } from "~/database/config.server";
import { usersTable } from "~/database/schema.server";

export const userSessionGet = async (request: Request) => {
  const session = await getSession(request.headers.get("cookie"));
  const user = session.get("user") as SessionUser;

  // Sync user session with database
  if (user?.id) {
    const userSession = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id));

    user.activeSessionId = userSession[0]?.activeSessionId ?? undefined;
  }

  return user;
};
